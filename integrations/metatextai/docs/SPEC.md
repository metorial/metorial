# Metatext AI API coverage

Metatext AI exposes a project-based Inference API at `https://api.metatext.ai`.
Requests use JSON and an `x-api-key` header. The [official authentication
guide](https://docs.metatext.ai/api-reference/inference) directs users to
support@metatext.io for API keys.

## V2 inference

- `classify_text`: `POST /v2/classify/{project_id}` with `text`, optional `model`,
  and optional `options` (`threshold`, `top_labels`, `refresh`, `version`).
  Returns the original prediction objects.
- `extract_entities`: `POST /v2/extract/{project_id}` with `text`, optional
  `model`, and optional `options.refresh`. Returns the original prediction
  objects and metadata when present.

Project IDs and model names come from the project's deployment details.

Sources: [Classify](https://docs.metatext.ai/api-reference/inference/classify),
[Extract](https://docs.metatext.ai/api-reference/inference/extract).

## Existing inference tools

The seven existing tool keys remain available: `analyze_sentiment`,
`extract_keywords`, `detect_spam`, `generate_blog_post`, `generate_headline`,
`generate_text`, and `run_custom_model`. Their hub and V1 paths and output
contracts are preserved. The current public reference does not document these
paths, so their availability and response formats require confirmation with
an authorized account. Their absence from the current reference does not
establish that they were removed.

The provider also documents a separate Guard API with bearer authentication.
This package does not expose Guard API operations.
