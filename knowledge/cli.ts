import { mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DOCUMENTS } from './manifest.ts';
import { extractChunks, fetchVerifiedPdf, hash } from './ingest.ts';
import { openKnowledge } from './store.ts';
import { disposeEmbeddings, MODEL_ID, MODEL_REVISION } from './embeddings.ts';

const command = process.argv[2];
if (command === 'prepare-model') {
  const root = resolve(process.env.POLICY_MODEL_DIR ?? '.knowledge/models');
  const files = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_quantized.onnx'];
  const hashes: Record<string, string> = {};
  for (const file of files) {
    const path = resolve(root, MODEL_ID, file);
    await mkdir(resolve(path, '..'), { recursive: true });
    // Pin every file to the inspected model revision. Fully buffer and validate
    // each response before atomic replacement; interrupted downloads never count.
    let bytes: Uint8Array | undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(`https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/${file}`, { signal: AbortSignal.timeout(120000) });
        if (!response.ok) throw new Error(`Model download HTTP ${response.status}`);
        bytes = new Uint8Array(await response.arrayBuffer());
        if (file.endsWith('.onnx') && bytes.length < 20000000) throw new Error('Incomplete model download');
        if (file.endsWith('.json')) JSON.parse(new TextDecoder().decode(bytes));
        break;
      } catch (failure) { if (attempt === 3) throw failure; }
    }
    if (!bytes) throw new Error('Model download failed');
    await writeFile(path + '.part', bytes); await rename(path + '.part', path);
    hashes[file] = hash(bytes); console.log(`Prepared ${file} (${bytes.length} bytes)`);
  }
  await writeFile(resolve(root, 'model-lock.json'), JSON.stringify({ model: MODEL_ID, revision: MODEL_REVISION, hashes }, null, 2));
} else {
  const store = await openKnowledge();
  try {
    if (command === 'ingest') {
      for (const document of DOCUMENTS) {
        const bytes = await fetchVerifiedPdf(document, process.argv.includes('--offline'));
        const chunks = await extractChunks(document, bytes);
        console.log(JSON.stringify(await store.ingest(document, chunks)));
      }
      console.log(JSON.stringify(await store.status(), null, 2));
    } else if (command === 'query') {
      const query = process.argv.slice(3).join(' ');
      const evidence = await store.search(query);
      console.log(JSON.stringify({ query, ...(await store.status()), evidence }, null, 2));
    } else if (command === 'status') console.log(JSON.stringify(await store.status(), null, 2));
    else throw new Error('Use prepare-model, ingest [--offline], query <question>, or status');
  } finally { await store.close(); await disposeEmbeddings(); }
}
