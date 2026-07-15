# Gemini Integration Specification

## Provider

Gemini is Google's generative AI API for text, multimodal prompting, image and Veo video generation, embeddings, files, token counting, and context caching. This integration targets the Gemini Developer API at `https://generativelanguage.googleapis.com`.

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
- `generate_video`: Start a Veo `predictLongRunning` text-to-video, image-to-video, or first/last-frame interpolation request. Returns the operation resource name; an optional `waitSeconds` (0-60, default 0) polls the operation about every 5 seconds and returns the last observed state without downloading the video.
- `get_video_operation`: Get a Veo long-running operation. Pending operations return status metadata; completed operations download generated MP4 bytes and return them only as Slate attachments.
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

Current high-value API coverage is focused on the public Gemini Developer API methods most useful for workflow automation: models, content generation, embeddings, tokens, files, image and Veo video generation, and explicit caching. Tuning, Live API, Batch API, file search stores, music generation, Veo reference-image/video-extension workflows, and Vertex AI-only workflows are intentionally not covered here because they require separate auth, specialized resources, or a different API surface.

Veo uses the Gemini Developer API `v1beta` surface and the same `x-goog-api-key` authentication as other tools. `generate_video` sends `POST /v1beta/models/{veo-model}:predictLongRunning`; `get_video_operation` sends `GET /v1beta/{operationName}`. Current Veo controls include aspect ratio, supported duration and resolution combinations (Veo 3.1 durations 4, 6, or 8 seconds; Veo 2 durations 5-8 seconds), person-generation policy, seed, optional negative prompt, and optional inline start/end frames. Model availability, billing, quotas, regional person-generation policies, and supported combinations remain provider-enforced.

Completed video responses contain temporary Gemini file URIs. The integration accepts only HTTPS Gemini file URLs, follows a small bounded set of trusted Google redirects without forwarding the API key to redirected hosts, requires an MP4-compatible MIME type and MP4 file signature, caps each download at 512 MiB, and keeps file content out of structured output. Gemini retains generated videos for a limited period, so callers should poll and download promptly.
