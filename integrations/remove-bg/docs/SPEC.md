# Remove.bg API integration

## API and authentication

The integration uses `https://api.remove.bg/v1.0` and authenticates with the
`X-Api-Key` header. Create an API key in the [account profile](https://www.remove.bg/profile#api-key).
OAuth is available only through a provider arrangement and is not configured here.

## Tools

- `remove_background` calls `POST /removebg`. It accepts one source image URL or
  base64 value, with optional output size, format, subject classification,
  cropping, positioning, scaling, region, background, and shadow controls.
  The processed file is downloadable. The existing `resultImageB64` output
  remains available for compatibility, alongside dimensions, foreground bounds,
  charged credits, and optional file metadata. Classification is omitted when
  `typeLevel` is `none`. For background images supplied as base64, the integration
  uploads decoded bytes through the documented `bg_image_file` multipart field.
- `get_account_info` calls `GET /account` for credit balances, remaining free
  calls, and the legacy available-size field. Balances can lag recent activity;
  the provider has deprecated its `sizes` field.
- `submit_feedback` calls `POST /improve` and returns the submission ID.
  Submission agrees to the [Improvement Program Conditions](https://www.remove.bg/ipc).
  The `tag` value groups related submissions.

## Compatibility

Existing tool keys, numeric output types, image source fields, and legacy enum
values remain available. `graphic` is added as the documented explicit subject
type. Missing required provider values cause an actionable error instead of
synthetic credit balances, dimensions, or submission identifiers.

Image processing accepts JPG, PNG, and WebP inputs up to 22 MB and 50 megapixels.
PNG results are limited to 10 megapixels; JPG, WebP, and ZIP can reach 50
megapixels. ZIP results contain `color.jpg` and `alpha.png`. The default output
size remains the provider default because no optional input defaults are added.
The improvement program allows 100 submissions per day.

## Provider transition

The provider announces that background removal moves to Leonardo.Ai starting
December 1, 2026. This integration retains its existing remove.bg endpoints;
users should review the provider's migration guidance before that date.

## Official references

- [API reference, formats, limits, and transition notice](https://www.remove.bg/api)
- [OpenAPI specification](https://www.remove.bg/api/swagger.yaml)
- [Improvement Program Conditions](https://www.remove.bg/ipc)

Verified against the public documentation on October 15, 2026. No authenticated
provider calls or live processing were performed for this refresh.
