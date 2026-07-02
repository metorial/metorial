# <img src="https://provider-logos.metorial-cdn.com/openai-logo.svg" height="20"> Openai

Generate text, images, audio, and video using large language models and multimodal AI. Create chat completions, generate and edit images from text prompts, convert text to speech, transcribe and translate audio, generate video, and create text embeddings for search and retrieval. Fine-tune models on custom training data, run evaluations to measure model performance, and moderate content against policy categories. Manage vector stores for semantic file search, upload and organize files, and submit batch processing jobs for asynchronous bulk requests. Conduct real-time speech-to-speech conversations via WebRTC or SIP. Administer organizations, projects, users, API keys, and audit logs programmatically. Receive webhook notifications for background responses, batch jobs, fine-tuning jobs, eval runs, and incoming realtime calls.

## Tools

### Create Embeddings

Generate vector embeddings for text input using OpenAI embedding models (text-embedding-3-small, text-embedding-3-large). Useful for search, RAG, clustering, and semantic similarity. Supports configurable output dimensions.

### Create Response

Generate a response using the OpenAI Responses API, the primary gateway for all model families. Supports text generation, built-in tools (web search, file search, code interpreter), function calling, structured output, and reasoning models with configurable effort levels.

### Generate Image

Generate images from text prompts using OpenAI's image generation models (e.g. DALL·E 3, gpt-image-1). Returns URLs or base64-encoded images. Supports configurable size, quality, and style.

### Generate Text

Generate text using OpenAI chat completion models (GPT-5, GPT-4o, etc.). Supports multi-turn conversations, system instructions, structured JSON output, and configurable generation parameters.

### List Models

List all available OpenAI models, or retrieve details about a specific model. Useful for discovering available model IDs, owners, and capabilities before making API calls.

### Create Batch

Submit a batch of API requests for asynchronous processing at reduced cost. Supports chat completions and embeddings endpoints. The input must be a JSONL file uploaded via the Files API.

### List Files

List files uploaded to OpenAI, optionally filtered by purpose (e.g. "fine-tune", "assistants"). Returns file metadata including ID, name, size, and purpose.

### Create Fine-Tuning Job

Create a new fine-tuning job to customize an OpenAI model on your training data. Supports supervised fine-tuning and direct preference optimization (DPO). Configure hyperparameters such as epochs, batch size, and learning rate.

### Create Vector Store

Create a managed vector store for uploading, chunking, and searching files. Vector stores power file search in the Responses API and support hybrid search (semantic + keyword).

### Moderate Content

Classify text against OpenAI's content policy categories. Returns flagged status and per-category scores for hate, harassment, self-harm, sexual, and violence content. Useful for filtering harmful content in user-generated input.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
