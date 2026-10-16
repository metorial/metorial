# GIPHY integration

Search and discover GIFs, stickers, channels, animated emoji, and related search terms. Retrieve media metadata by ID, upload remote media, create anonymous end-user identifiers, and register real content interactions.

## Authentication and defaults

Use a GIPHY Developer Dashboard API key. API requests send `api_key`; remote uploads send the key and upload parameters in the JSON request body, matching the [official upload example](https://developers.giphy.com/docs/resource/). No OAuth refresh or account identity endpoint is documented for this API. Creator metadata on GIFs and channels describes the content owner; it does not identify the API-key owner. A random ID identifies an anonymous end user, not the connected account.

Optional connection defaults select the rating and search language. Existing explicit tool inputs take precedence through the established truthy fallback; absent parameters retain provider defaults. No opaque resource ID is required in connection configuration.

Beta keys allow 100 API calls per hour. Uploads with rate-limited keys are limited to 10 per day and cannot specify a channel username; approved production upload keys use the assigned username. Media uploads accept GIFs or video up to 100 MB. If an upload response lacks the required GIF ID, the tool reports that uncertainty and advises checking the channel before retrying; it never invents an ID.

## Tool coverage

All paths below use `https://api.giphy.com`, except uploads and analytics.

| Tool | Documented operations |
| --- | --- |
| `search_gifs` | `GET /v1/gifs/search` or `/v1/stickers/search`; query, pagination, rating, language, rendition bundle, channel IDs, contrast filter |
| `trending_content` | `GET /v1/gifs/trending` or `/v1/stickers/trending`; pagination, rating, rendition bundle, contrast filter |
| `translate_to_gif` | `GET /v1/gifs/translate` or `/v1/stickers/translate` using `s` |
| `random_gif` | `GET /v1/gifs/random` or `/v1/stickers/random` using optional `tag` |
| `get_gifs` | `GET /v1/gifs/{gif_id}` for one ID, or `/v1/gifs?ids=...` for up to 100 IDs |
| `animated_emoji` | `GET /v2/emoji` or `/v2/emoji/{gif_id}/variations` |
| `search_suggestions` | `GET /v1/trending/searches`, `/v1/tags/related/{term}`, `/v1/gifs/search/tags`, or `/v1/gifs/categories` |
| `search_channels` | `GET /v1/channels/search` |
| `upload_gif` | `POST https://upload.giphy.com/v1/gifs` with remote URL, tags, source link, and optional assigned username |
| `create_random_id` | `GET /v1/randomid`; retain the actual returned identifier as `customerId` for the same user |
| `register_action` | `GET` to the corresponding provider-returned analytics URL; append actual interaction timestamp `ts` and stable end-user `customer_id` |

Documented endpoints accept optional `customer_id`. GIF search, trending, translation, random, retrieval, and upload additionally accept the end user's country and region. Search accepts up to five channel IDs. Provider pagination bounds include a maximum search offset of 4999 and trending offset of 499. Existing schemas remain compatible; the provider validates its request limits.

Complete provider responses are available in `raw`. GIFs also expose original raw metadata, analytics URLs, alt text, variation count, and unchanged rendition URLs. No search or discovery call automatically registers an analytics event. Analytics requests are restricted to the documented HTTPS host and path, do not follow redirects, and never receive the API key.

## Display and delivery requirements

GIPHY requires attribution and direct client API/media requests. Keep media URLs unchanged, including query parameters. Media caching and proxying require explicit approval from GIPHY; this integration exposes metadata and does not add media downloads. Deployment must satisfy the provider's client-request policy. Clips require separate provider approval and are not included. This package uses one GIPHY content API product; GIF, sticker, emoji, upload, and discovery operations do not require separate product categories. No webhook API is documented.

## Official references

- [Endpoints and parameters](https://developers.giphy.com/docs/api/endpoint/)
- [GIF, rendition, pagination, analytics, emoji, and channel schemas](https://developers.giphy.com/docs/api/schema/)
- [Authentication, rate limits, attribution, and delivery requirements](https://developers.giphy.com/docs/api/)
- [Remote-upload request example](https://developers.giphy.com/docs/resource/)
