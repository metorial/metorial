# AI21 Studio integration

Authenticate with an AI21 Studio API key, sent as a Bearer token to `https://api.ai21.com/studio/v1`. No workspace or model IDs are required at connection setup. The current public documentation has no suitable account identity endpoint.

Supported workflows:

- `chat_completion`: non-streaming Jamba chat, JSON mode, document context, and function calls. Preserve returned assistant `toolCalls` in the next conversation, then supply a matching `toolCallId` on each tool response. Current documented aliases are `jamba-large` and `jamba-mini`, with optional current dated snapshots.
- `maestro_run` and `get_maestro_run`: create and retrieve asynchronous runs with validation requirements, budget, and optional file or web search. Creation may return `in_progress`; retain `runId` and poll until a terminal status. Sources remain available as an array for compatibility and are also exposed by their provider categories.
- `upload_file`, `list_files`, `get_file`, `update_file`, `download_file`, `delete_file`: complete document-library lifecycle. Upload UTF-8 text or base64 bytes for PDF/DOCX, up to 5 MB. Processing is asynchronous; inspect status and processing errors before retrieval. `publicUrl` is source metadata, not a substitute for uploaded bytes. List uses offset/limit pagination and exact label/name/status filtering. Downloads provide the original document with signed URL renewal.
- `conversational_rag`: query indexed library documents with alternating user/assistant turns and optional file/label/path filters. Responses expose grounding and source metadata. The established token-usage object retains zero values when counts are unavailable; `usageReported` identifies whether the provider actually supplied counts.

AI21 removed Jurassic-2 and the task-specific models in its official Python SDK v3.0.0 on November 11, 2024. The legacy keys `text_completion`, `summarize`, `summarize_by_segment`, `paraphrase`, `text_improvements`, `grammar_check`, `segment_text`, and `contextual_answer` retain their input and output schemas but are deprecated and fail with explicit migration guidance. Use chat task instructions and supplied context, or Maestro requirements; those workflows do not automatically reproduce the retired APIs' specialized semantics.

The documented Jamba aliases currently resolve to Large 1.7 and Mini 2. Older 1.5/1.6 snapshots and Mini 1.7 have provider deprecation dates. Generation, retrieval, and library processing depend on account access, balance, and provider billing. There are no trigger definitions.

Official references: [API authentication](https://docs.ai21.com/reference/authentication), [Jamba chat](https://docs.ai21.com/reference/jamba-1-6-api-ref), [models and retirements](https://docs.ai21.com/docs/jamba-foundation-models), [Maestro create](https://docs.ai21.com/reference/maestro-create-run), [Maestro retrieve](https://docs.ai21.com/reference/retrieve-run), [library API](https://docs.ai21.com/reference/manage-library-ref), and [official SDK sunset changelog](https://github.com/AI21Labs/ai21-python/blob/main/CHANGELOG.md).
