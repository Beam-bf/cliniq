# ITU reference adaptation

The word-window chunking in `ingest.ts` adapts
`simulation/server/knowledge/ingest.py::chunk_text` from
[ITUAIReadiness](https://github.com/CrashingGuru/ITUAIReadiness/tree/84010da9e9c443afcceeccb86d1700a662223395),
copyright (c) 2026 Vishnu Ram OV, MIT licensed. The complete notice is retained
in [licenses/ITUAIReadiness-MIT.txt](licenses/ITUAIReadiness-MIT.txt).

The adaptation retains overlapping word windows, reduces window size for MiniLM,
preserves exact PDF-extracted character offsets and page/section boundaries,
and never merges short tails with duplicated overlap. The parse → chunk → embed →
vector-store → query flow follows the inspected reference. Persistent PostgreSQL
pgvector replaces Chroma; local ONNX MiniLM replaces the Ollama embedding service.
These are real implementations, not simulated vector search.

The MIT licence covers reference software, not DHA or AI Office publications.
Official documents and extracted passages stay in the ignored local `.knowledge/`
cache/database. Verify redistribution permission before publishing a corpus or
exposing the service beyond the authorized demo. Original source links and exact
locators are retained; no third-party publication is relicensed by this notice.
