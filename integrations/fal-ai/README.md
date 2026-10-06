# Fal.ai

Discover model endpoints and their OpenAPI input/output schemas, inspect current model pricing, and run image, video, speech, transcription, or arbitrary model inference. Generated media is provided as downloadable files with provider URLs when hosted. Upload public input files to the CDN with a chosen expiry, or submit asynchronous inference and poll its status, fetch results, and request cancellation.

Use an API-scoped key for ordinary inference and model discovery. `get_account` identifies the account and reads its credit balance with an ADMIN-scoped key; it is optional and is not required to connect or run models.

Model parameters vary by endpoint. Call `search_models` with `endpointId` and `includeSchema: true` before selecting model-specific options. Slow generation is best submitted with `submit_queue_request`. A caller-supplied `webhookUrl` sends results to your own server; this package exposes no event triggers.

See [the tool reference](./docs/SPEC.md) and [fal.ai's official documentation](https://fal.ai/docs/documentation/model-apis/inference/queue).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
