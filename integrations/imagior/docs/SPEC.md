# Imagior API Specification

Imagior renders images from design templates created in its dashboard. Connect with an API key from the Developers page; requests use `Authorization: Bearer YOUR_API_KEY` against `https://api.imagior.com`.

## Tools

| Tool | Provider endpoint | Purpose |
| --- | --- | --- |
| `generate_image` | `POST /image/generate` | Render a downloadable image using `templateId` and optional `elements` overrides. |
| `list_templates` | `GET /templates/all` | Discover template IDs, names, and timestamps. |
| `get_template_elements` | `GET /templates/{templateId}/elements` or `/elements/basic` | Discover named element properties, with full or basic detail. |
| `get_account` | `GET /user/account` | Read account name, email, and remaining credits. |

Template listing accepts `sort` values `createdAt` and `updatedAt`, and `order` values `asc` and `desc`. The provider defaults to descending `updatedAt`.

Element inspection returns the provider's `elements` map. Basic inspection shows common properties such as text content, image sources, and fill colors. Full inspection includes additional layout and style properties. Pass overrides keyed by these element names when rendering.

Generation keeps the returned image URL, optional dimensions, format, and credit metadata available in its result and provides the image for download. Each generated image consumes one credit. Read operations do not consume credits, though rate limits apply.

## Documentation

- [Generate image](https://docs.imagior.com/api-reference/image-generate)
- [Generation request and response example](https://docs.imagior.com/getting-started/first-api-call)
- [List templates](https://docs.imagior.com/api-reference/retrieve-all-templates)
- [Full elements](https://docs.imagior.com/api-reference/retrieve-template-elements)
- [Basic elements](https://docs.imagior.com/api-reference/retrieve-basic-template-elements)
- [Account details](https://docs.imagior.com/api-reference/retrieve-account-details)

The public API reference documents these five endpoints. It does not document an image history, render-status, or template-write endpoint. No additional endpoints are assumed.
