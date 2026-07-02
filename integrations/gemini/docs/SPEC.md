# Gemini Integration Specification

## Provider

Gemini is Google's generative AI API for text, multimodal prompting, image generation, embeddings, files, token counting, and context caching. This integration targets the Gemini Developer API at `https://generativelanguage.googleapis.com`.

## Authentication

The integration uses a Google AI Studio API key sent as the `x-goog-api-key` request header. The auth profile check validates the key by listing one model.

## Configuration

- `apiVersion`: `v1beta` by default, or `v1`.

## Tools

- `list_models`: List available models and supported methods.
- `get_model`: Get metadata for a specific model.
- `generate_text`: Generate text from single-turn or multi-turn prompts. Supports system instructions, JSON response schema, safety settings, thinking controls, code execution, Google Search grounding, URL Context, and cached content references.
- `generate_embeddings`: Generate one or more text embeddings.
- `generate_image`: Generate images with native Gemini image models or Imagen models.
- `count_tokens`: Count tokens for prompt text before generation.
- `upload_file`: Upload a file to Gemini's File API using resumable upload.
- `list_files`: List uploaded files.
- `get_file`: Get uploaded file metadata.
- `delete_file`: Delete an uploaded file.
- `create_cached_content`: Create an explicit cached content entry.
- `list_cached_contents`: List cached content metadata.
- `get_cached_content`: Get metadata for one cached content entry.
- `update_cached_content`: Update cached content expiration.
- `delete_cached_content`: Delete cached content.

## Triggers

The Gemini Developer API does not provide provider-native webhook subscriptions. The integration does not model any Gemini-specific events.

## API Coverage Notes

Current high-value API coverage is focused on the public Gemini Developer API methods most useful for workflow automation: models, generation, embeddings, tokens, files, image generation, and explicit caching. Tuning, Live API, Batch API, file search stores, music/video generation, and Vertex AI-only workflows are intentionally not covered here because they require separate auth, long-running orchestration, specialized resources, or a different API surface.
