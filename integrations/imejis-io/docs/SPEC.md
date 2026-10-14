# Imejis.io Integration

Imejis.io renders template-based images and single-page PDFs with dynamic text,
colors, images, QR codes, and other component properties.

## Authentication

Connect with an API key from the [Imejis.io dashboard](https://app.imejis.io).
Render requests use the `dma-api-key` header. This integration retains the
existing API key authentication for its design-listing and AI-assistant tools.

## Rendering

`generate_image` posts template overrides to
`https://render.imejis.io/v1/{designId}`. Overrides may use nested component
objects or dot notation. The existing `responseFormat` values are retained:

- `url` requests public hosted delivery and returns `imageUrl`.
- `binary` returns the original `imageBase64` and `contentType` values.

Both modes also provide a downloadable file. Optional `format` selects `png`,
`jpeg`, `webp`, or single-page `pdf`; omitted format uses the provider's JPEG
default. Optional `quality` is a whole number from 1 to 100 and affects JPEG
only. Each render consumes the provider's quota or credits.

`generate_signed_image` requests private signed delivery with a configurable
lifetime in minutes, defaulting to 60 and limited to 7 days. It returns the
signed URL, the design ID, MIME type, and a conservative expiry timestamp based
on the requested lifetime. Anyone with the URL can access it until it expires.
The download link expires too. To get a replacement, invoke the tool again;
this performs another render and consumes quota or credits. Downloads do not
regenerate files automatically.

## Design management

`list_designs` retains its search, cursor, limit, and visibility inputs and
returns design identifiers and available metadata. `ai_design_assistant` retains
its natural-language prompt and optional design ID.

The current public documentation describes these management capabilities but
does not publish the REST request, response, or API key authorization contracts
for the existing `/api/designs` and `/api/ai/designs` routes. Their routes and
public schemas are preserved for compatibility; their current availability has
not been verified against a live account.

## Official references

- [API documentation](https://www.imejis.io/apis)
- [Render formats and hosted or signed delivery](https://www.imejis.io/help/generate-images-with-the-api)
- [cURL guide](https://www.imejis.io/apis/curl)
- [Hosted render example](https://www.imejis.io/blogs/tutorials/how-to-generate-images-with-api)
- [AI agent capabilities](https://www.imejis.io/agents)
- [Product changelog](https://www.imejis.io/changelogs)
