import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pipeline, env } from '@huggingface/transformers';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const MODEL_REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';
export const EMBEDDING_ID = `${MODEL_ID}@${MODEL_REVISION}:q8:mean:normalized`;
export const DIMENSIONS = 384;
let loading: Promise<FeatureExtractionPipeline> | undefined;
async function loadModel() {
  const root = resolve(process.env.POLICY_MODEL_DIR ?? '.knowledge/models');
  const lock = JSON.parse(await readFile(resolve(root, 'model-lock.json'), 'utf8')) as { model: string; revision: string; hashes: Record<string, string> };
  if (lock.model !== MODEL_ID || lock.revision !== MODEL_REVISION) throw new Error('Model revision mismatch; run npm run kb:prepare-model');
  for (const file of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_quantized.onnx']) {
    const bytes = await readFile(resolve(root, MODEL_ID, file));
    if (createHash('sha256').update(bytes).digest('hex') !== lock.hashes[file]) throw new Error('Model checksum mismatch; run npm run kb:prepare-model');
  }
  return pipeline('feature-extraction', MODEL_ID, { dtype: 'q8', device: 'cpu' });
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  // Only the preparation CLI downloads models. Serving/ingestion use local files.
  env.localModelPath = resolve(process.env.POLICY_MODEL_DIR ?? '.knowledge/models') + '/';
  env.allowRemoteModels = false;
  loading ??= loadModel().catch(failure => { loading = undefined; throw failure; });
  const extractor = await loading;
  const result: number[][] = [];
  for (const text of texts) {
    if (!text.trim() || text.length > 1400) throw new Error('Embedding input must contain 1–1400 characters');
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const values = Array.from(output.data, Number);
    if (values.length !== DIMENSIONS || !values.every(Number.isFinite)) throw new Error('Invalid model embedding');
    result.push(values);
  }
  return result;
}
export async function disposeEmbeddings() {
  if (loading) { const extractor = await loading; await extractor.dispose(); loading = undefined; }
}
