# TextCortex integration specification

TextCortex exposes an OpenAI-compatible API at `https://api.textcortex.com/v1`.
The current official [API reference](https://docs.textcortex.com/) and
[OpenAPI export](https://api.textcortex.com/v1/openapi.json) document five operations:

- `GET /models`: discover current model IDs.
- `GET /models/{model_id}`: retrieve model and deployment metadata.
- `GET /balance`: retrieve remaining API credits and their currency.
- `POST /chat/completions`: generate chat completions, including multiple outputs.
- `POST /responses`: generate responses; stored responses are unsupported.

## Authentication

Create an API key in TextCortex API Settings and supply it as
`Authorization: Bearer <api_key>`. See the official
[API onboarding guide](https://help.textcortex.com/hc/en-us/articles/25546707607185-TextCortex-API-Deploy-AI-on-your-platform).
API credit billing is separate from product subscriptions. No OAuth refresh,
workspace configuration, or account identity endpoint is documented.

## Supported workflows

The integration preserves its text, blog, product description, ad copy, email,
social post, rewrite, summary, translation, and code generation tools. Each
workflow submits task-specific system instructions and the supplied content to
`POST /chat/completions`. Source and target languages are expressed as
instructions, not unsupported provider request fields. Completion text,
provider completion ID, selected model, token usage when available, and the
balance read after generation are returned. If the balance request fails, the
generated content is still returned with a warning; `remainingCredits` is
optional in that case. This optional balance lookup has a ten-second deadline
so it does not hold up delivery of completed content. Call `get_balance` to
retry the credit lookup.

Call `list_models` before choosing a model. Model IDs are not frozen to the
retired Velox, Alta, or Sophos model families. If omitted, the integration uses
`gpt-4o-mini` when advertised by the current catalog, otherwise its first model.
Optional temperature is passed only when supplied; otherwise the model's
provider default applies. Maximum tokens and output count must be positive
integers. The model catalog does not have pagination.

`get_model` returns advertised deployment jurisdiction and country metadata;
`get_balance` checks credit availability without generating content.

## Limits

The current API does not document the old `/texts/*` operations, a file lookup,
knowledge-base management, embeddings, or an account profile endpoint. The
legacy `fileId` and `embeddings` summarization inputs remain visible for
existing callers but report actionable errors. Supply raw text with
`mode: "default"`. No unsupported endpoint is called.

The separate Responses operation is not exposed because the writing tools
already cover generation through chat completions. Streaming and model-side
tool execution are outside these writing workflows. Text results are ordinary
content; the API does not generate downloadable files for these operations.
There are no triggers.
