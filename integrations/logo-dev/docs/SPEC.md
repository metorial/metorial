# Logo.dev specification

## Authentication

Configure a secret key (`sk_...`) for API requests. It is sent server-side as an `Authorization: Bearer` header to `api.logo.dev`. Configure the optional publishable key (`pk_...`) to use `get_logo_url`; this key belongs in the CDN URL's `token` parameter and is safe to embed in a website or application. Each key works only on its own host.

The publishable key can be omitted for search, profiles, and image downloads. CDN display URLs require it. If domain restrictions are enabled, the displaying application must send an allowed `Referer` header. API keys do not use OAuth or token refresh. There are no connection-level resource IDs.

## Tools

| Tool | API and behavior |
| --- | --- |
| `get_logo_url` | Builds an `img.logo.dev` display URL by domain, ticker, crypto symbol, ISIN, or company name. Supports JPG, PNG, WebP, size, width, height, light/dark theme, greyscale, retina, monogram/404 fallback, and redirect handling. Requires the publishable key. |
| `search_brands` | Calls `GET /v2/search`, returning names, domains, and display URLs. Existing `strategy` maps to the provider's `method`; the existing typeahead default is retained. Optional `limit` accepts 1–25, default 10. |
| `lookup_brand` | Calls `GET /v2/brands` with exactly one identifier, or `GET /v2/brands/{id}` for a stable brand ID. Returns the profile, colors, socials, logo/brandmark/banner metadata, and request metadata. Uses `nosubscribe=true` to avoid automatically creating a webhook subscription. |
| `download_brand_image` | Calls `GET /v2/brands/logo` or `/v2/brands/brandmark`, then provides the signed file for download with its actual metadata. Supports JPG, PNG, WebP, size, and light/dark theme; PNG is the download default. |
| `describe_brand` | Deprecated legacy `GET /describe/{domain}`. Retains its original input/output contract and invocation handler for accounts already enabled for Describe. Use `lookup_brand` for current profiles. Missing data needed by its legacy output is reported as an error. |

Tool groups separate Logo CDN, Brand API, and Search API. Search and brand requests consume API credits. Legacy Describe is restricted to enabled accounts. No suitable public account/profile/self endpoint is documented, so the integration does not invent an identity tool.

## Images and status handling

CDN URLs are for displaying images. Use `download_brand_image` when a file is needed for storage, documents, email, or processing. CDN images are not downloaded to build a separate copy.

A download uses the provider's signed asset URL, with the selected rendering parameters. Signed URLs expire at the actual provider `expires_at` value. Download links are renewed before expiry using the returned stable brand ID, image kind, and rendering options; credentials are never stored in the renewal reference. New download outputs contain image metadata rather than a signed URL or file contents. The legacy Describe logo URL remains unchanged for compatibility.

A ready v2 response returns its actual profile or image. A `202` returns `not_indexed` with retry guidance. Retry after `metadata.pending.retry_after_seconds` and stop after `expires_in_seconds`. A documented `404` lookup miss returns `not_found`; image misses can also mean the brand lacks a logo or brandmark. Other API errors retain provider messages and error codes. Malformed required response data is an error, without invented IDs, statuses, descriptions, or timestamps.

CDN sizing uses whole pixels up to 800; retina doubles the rendered resolution. The dark theme requires PNG or WebP. Commercial use on the free plan may require Logo.dev attribution. The provider exposes webhook management and a separate private-beta Transaction API; neither is implemented here.

## Official references

- [Documentation index](https://www.logo.dev/docs/llms.txt)
- [Current OpenAPI](https://www.logo.dev/docs/openapi.json) and [retired v1 OpenAPI](https://www.logo.dev/docs/openapi-v1.json)
- [API keys](https://www.logo.dev/docs/platform/api-keys)
- [Brand profiles](https://www.logo.dev/docs/brand/introduction)
- [Search](https://www.logo.dev/docs/brand-search/introduction)
- [Logo downloads](https://www.logo.dev/docs/api-reference/logos/get-a-logo) and [brandmark downloads](https://www.logo.dev/docs/api-reference/logos/get-a-brandmark)
- [Self-hosting](https://www.logo.dev/docs/platform/self-hosting) and [errors/status codes](https://www.logo.dev/docs/platform/errors)
