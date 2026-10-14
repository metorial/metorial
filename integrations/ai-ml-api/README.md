# <img src="logo.png" height="20"> AI/ML API

Generate chat responses, images, speech audio, transcription text, embeddings, moderation classifications, and MiniMax videos through AI/ML API. Discover model IDs and capabilities before invoking a model, identify the connected account, and retrieve asynchronous results after an initial request finishes polling.

## Tools

| Tool | Purpose |
| --- | --- |
| `chat_completion` | Generate a response from conversation messages. |
| `generate_image` | Generate downloadable images; existing provider URL or base64 values are retained. |
| `text_to_speech` | Generate downloadable speech audio and return the provider URL when available. |
| `speech_to_text` | Submit an audio URL and poll for its transcription. |
| `generate_embeddings` | Generate numeric vectors; base64 responses also retain their original encoded value. |
| `moderate_content` | Classify text or images with a compatible Llama Guard model. |
| `generate_video` | Generate a MiniMax video and poll for its downloadable result. |
| `list_models` | Discover model IDs, aliases, endpoint types, and optional capabilities, modalities, and pricing. |
| `get_current_user` | Identify the connected account and check its balance. |
| `get_video_result` | Check a previously submitted video task. |
| `get_transcription_result` | Retrieve a previously submitted transcription task. |

## Setup and model selection

Use an AI/ML API key from the [account dashboard](https://aimlapi.com/app/keys). The default API base URL is `https://api.aimlapi.com`.

Call `list_models` to discover a model ID and its documentation URL. Parameters vary by model: image count, image size, negative prompts, JSON mode, voice, and other settings are not universally supported. Image moderation requires a vision-capable model such as `meta-llama/Llama-Guard-3-11B-Vision-Turbo`.

If an asynchronous operation is still processing, use its returned `generationId` with the corresponding result tool. The provider retains transcription results for one hour.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
