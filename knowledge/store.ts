import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, open, unlink } from 'node:fs/promises';
import type { PolicyEvidence, LegalClassification } from '../src/policy/knowledgeTypes.ts';
import type { VerifiedDocument } from './manifest.ts';
import type { ExtractedChunk } from './ingest.ts';
import { hash } from './ingest.ts';
import { DIMENSIONS, EMBEDDING_ID, embed } from './embeddings.ts';

export async function openKnowledge(dataDir: string = resolve('.knowledge/database')) {
  const lockPath = dataDir === ':memory:' ? null : resolve(dataDir) + '.lock';
  if (lockPath) await mkdir(resolve(lockPath, '..'), { recursive: true });
  const lock = lockPath ? await open(lockPath, 'wx').catch(() => { throw new Error('Knowledge database is already in use. Stop the service before running ingestion or CLI queries.'); }) : null;
  if (lock) await lock.writeFile(String(process.pid));
  async function release() { if (lock && lockPath) { await lock.close(); await unlink(lockPath); } }
  let db: PGlite;
  try { db = await PGlite.create({ dataDir: dataDir === ':memory:' ? undefined : dataDir, extensions: { vector } }); }
  catch (failure) { await release(); throw failure; }
  try {
  await db.exec(`CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS kb_settings (id integer PRIMARY KEY CHECK(id=1), model text NOT NULL);
    CREATE TABLE IF NOT EXISTS kb_documents (key text PRIMARY KEY, document_id text NOT NULL, metadata jsonb NOT NULL, current boolean NOT NULL DEFAULT true);
    CREATE TABLE IF NOT EXISTS kb_chunks (id text PRIMARY KEY, document_key text NOT NULL REFERENCES kb_documents(key),
      pdf_page integer NOT NULL, printed_page text NOT NULL, section text NOT NULL, passage text NOT NULL,
      start_offset integer NOT NULL, end_offset integer NOT NULL, embedding vector(384) NOT NULL);
    CREATE INDEX IF NOT EXISTS kb_chunks_cosine ON kb_chunks USING hnsw (embedding vector_cosine_ops);
    CREATE TABLE IF NOT EXISTS kb_audit(id uuid PRIMARY KEY, kind text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), snapshot jsonb NOT NULL);`);
  await db.query('INSERT INTO kb_settings VALUES(1,$1) ON CONFLICT DO NOTHING', [EMBEDDING_ID]);
  const model = (await db.query<{ model: string }>('SELECT model FROM kb_settings WHERE id=1')).rows[0].model;
  if (model !== EMBEDDING_ID) throw new Error('Embedding model changed; create a separately versioned database before ingestion');
  } catch (failure) { try { await db.close(); } finally { await release(); } throw failure; }

  return {
    async recordAudit(kind: 'search' | 'assessment' | 'chat', snapshot: unknown, id: string = randomUUID()) {
      await db.query('INSERT INTO kb_audit(id,kind,snapshot) VALUES($1,$2,$3)', [id, kind, JSON.stringify(snapshot)]);
      return id;
    },
    async auditSnapshot(id: string) {
      const result = await db.query<{ snapshot: unknown }>('SELECT snapshot FROM kb_audit WHERE id=$1', [id]);
      return result.rows[0]?.snapshot;
    },
    async ingest(document: VerifiedDocument, chunks: ExtractedChunk[]) {
      if (!chunks.length || !document.verifiedOn || !document.publisher || !document.url.startsWith('https://') || !/^[a-f0-9]{64}$/.test(document.sha256)) throw new Error('Missing verified provenance');
      const key = `${document.id}:${hash(JSON.stringify(document) + EMBEDDING_ID)}`;
      const existing = await db.query('SELECT key FROM kb_documents WHERE key=$1', [key]);
      if (existing.rows.length) return { documentId: document.id, chunks: chunks.length, unchanged: true };
      const vectors = await embed(chunks.map(chunk => chunk.passage));
      await db.transaction(async transaction => {
        // Retain old versions for audit/citation reconstruction; only current versions are searched.
        await transaction.query('UPDATE kb_documents SET current=false WHERE document_id=$1', [document.id]);
        const metadata = { ...document, selections: undefined, cacheFile: undefined };
        await transaction.query('INSERT INTO kb_documents(key,document_id,metadata) VALUES($1,$2,$3)', [key, document.id, JSON.stringify(metadata)]);
        for (const [i, chunk] of chunks.entries()) {
          const embedding = vectors[i];
          if (embedding.length !== DIMENSIONS) throw new Error('Embedding dimensions mismatch');
          await transaction.query(`INSERT INTO kb_chunks(id,document_key,pdf_page,printed_page,section,passage,start_offset,end_offset,embedding)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::vector)`,
          [chunk.id, key, chunk.pdfPage, chunk.printedPage, chunk.section, chunk.passage, chunk.startOffset, chunk.endOffset, JSON.stringify(embedding)]);
        }
      });
      return { documentId: document.id, chunks: chunks.length, unchanged: false };
    },
    async status() {
      const docs = (await db.query<{ key: string; metadata: Record<string, unknown>; chunks: number }>(`SELECT d.key,d.metadata,count(c.id)::int AS chunks
        FROM kb_documents d JOIN kb_chunks c ON c.document_key=d.key WHERE d.current GROUP BY d.key ORDER BY d.key`)).rows;
      const ext = (await db.query<{ extversion: string }>("SELECT extversion FROM pg_extension WHERE extname='vector'")).rows[0].extversion;
      return { engine: 'pgvector' as const, extensionVersion: ext, model: EMBEDDING_ID, dimensions: DIMENSIONS,
        kbRevision: hash(docs.map(d => d.key).join('|') + EMBEDDING_ID), documents: docs.map(d => ({ ...d.metadata, chunks: d.chunks })),
        chunkCount: docs.reduce((sum, d) => sum + d.chunks, 0) };
    },
    async search(query: string, options: { documentIds?: string[]; pdfPages?: number[]; classification?: LegalClassification; asOf?: string; limit?: number } = {}): Promise<PolicyEvidence[]> {
      if (typeof query !== 'string' || !query.trim() || query.length > 600) throw new Error('Search requires 1–600 characters');
      const limit = Math.min(Math.max(options.limit ?? 5, 1), 8);
      const asOf = options.asOf ?? new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error('Invalid applicability date');
      const [embedding] = await embed([query]);
      // This is real pgvector cosine-distance retrieval over stored neural vectors.
      const result = await db.query<{ id: string; document_id: string; metadata: VerifiedDocument; pdf_page: number; printed_page: string;
        section: string; passage: string; start_offset: number; end_offset: number; score: number }>(`
        SELECT c.id,d.document_id,d.metadata,c.pdf_page,c.printed_page,c.section,c.passage,c.start_offset,c.end_offset,
          1-(c.embedding <=> $1::vector) AS score
        FROM kb_chunks c JOIN kb_documents d ON d.key=c.document_key
        WHERE d.current AND (d.metadata->>'verifiedOn') <= $2
          AND ((d.metadata->>'effectiveOn') IS NULL OR (d.metadata->>'effectiveOn') <= $2)
          AND ($3::text[] IS NULL OR d.document_id=ANY($3::text[]))
          AND ($4::text IS NULL OR d.metadata->>'classification'=$4)
          AND ($6::int[] IS NULL OR c.pdf_page=ANY($6::int[]))
          AND 1-(c.embedding <=> $1::vector) >= 0.40
        ORDER BY c.embedding <=> $1::vector, c.id LIMIT $5`,
      [JSON.stringify(embedding), asOf, options.documentIds ?? null, options.classification ?? null, limit, options.pdfPages ?? null]);
      return result.rows.map(row => ({ id: row.id, documentId: row.document_id, title: row.metadata.title,
        publisher: row.metadata.publisher, url: row.metadata.url, jurisdiction: row.metadata.jurisdiction,
        classification: row.metadata.classification, version: row.metadata.version, verifiedOn: row.metadata.verifiedOn,
        effectiveOn: row.metadata.effectiveOn, sourceSha256: row.metadata.sha256, pdfPage: row.pdf_page, printedPage: row.printed_page,
        section: row.section, passage: row.passage, startOffset: row.start_offset, endOffset: row.end_offset, score: Number(row.score), sourceNote: row.metadata.verificationNote }));
    },
    close: async () => { try { await db.close(); } finally { await release(); } },
  };
}
export type KnowledgeStore = Awaited<ReturnType<typeof openKnowledge>>;
