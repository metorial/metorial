# All Images AI

All-Images.ai provides asynchronous Midjourney image generation and a stock-image library. The API base URL is `https://api.all-images.ai/v1`.

## Authentication

Create a personal access token in the [API Keys page](https://app.all-images.ai/en/api-keys). Requests authenticate with the `api-key` header. Tokens inherit the permissions of their associated account. `who_am_i` checks the token and returns the account email and optional name.

## Tools

| Tool | Provider operation |
| --- | --- |
| `generate_image` | `POST /image-generations` |
| `get_generation` | `GET /image-generations/{imageGenerationId}` |
| `list_generations` | `GET /image-generations` |
| `update_generation` | `PUT /image-generations/{printId}` |
| `retry_generation` | `POST /image-generations/retry/{imageGenerationId}` |
| `delete_generations` | `DELETE /image-generations` |
| `search_images` | `POST /images/search` |
| `buy_image` | `POST /images/buy` |
| `get_download_history` | `POST /images/downladed` |
| `get_credits` | `GET /credit` |
| `who_am_i` | `GET /api-keys/check` |

Generation creation requires a name, mode (`simple` or `advanced`), and prompt. Prompts allow at most 4096 characters; an additional prompt allows at most 1024. Simple mode supports photo style, aspect ratio, weather, time, camera, chaos, stylization, exclusions, and a reference image. Photo style uses the provider's `templatePrompt` parameter. Dedicated-plan users can select `fast` or `relax` processing.

Generation is asynchronous. Documented statuses are `0` created, `1` pending, `2` processing, `3` done, and `4` error. The API schema additionally permits status `5` without defining its meaning; it is returned unchanged with an `unknown` label. Use `get_generation` to check progress and download available images. Updates are unavailable while a generation is pending or processing; failed generations can be updated and retried.

Search, generation listing, and download history accept optional `limit`, `offset`, and provider `sort` expressions. Downloads can also be filtered by date. The spelling `downladed` is the provider's documented endpoint. Stock image purchases consume credits only on the first purchase of that image and return downloadable full-size and available upscale versions.

Generation IDs and image lists are returned when supplied by the provider. Numeric `filteredResults` values remain numeric; `resultCountMetadata` retains the original metadata because the provider's OpenAPI describes that field as an optional object. An absent total is not replaced with zero.

## Documentation

- [Authentication](https://developer.all-images.ai/all-images.ai-api/authentication)
- [Official OpenAPI](https://api.all-images.ai/doc-json)
- [Image endpoints](https://developer.all-images.ai/all-images.ai-api/api-reference/images)
- [Generation endpoints](https://developer.all-images.ai/all-images.ai-api/api-reference/images-generation)
- [Generation parameters](https://developer.all-images.ai/integration-guide/image-generation/create-image-generation)
- [Generation lifecycle](https://developer.all-images.ai/integration-guide/image-generation/lifecycle-of-image-generation)
