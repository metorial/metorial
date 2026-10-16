# Neutrino Specification

Neutrino exposes stateless utility APIs for validation, security and networking, geolocation, e-commerce, telephony, web metadata, and imaging. The tool categories follow the provider's API families.

## Authentication

Use the existing API Key connection with `userId` and `apiKey`. The saved output remains `userId` and `token`. Requests send `User-ID` and `API-Key` headers to `https://neutrinoapi.net` using JSON POST bodies; the provider accepts JSON requests and both credential headers. There is no OAuth refresh flow, required resource configuration, or documented account identity API.

## Capabilities

- Email syntax/DNS validation and SMTP verification; phone parsing and formatting.
- IP geolocation, blocklist and network intelligence; host reputation.
- Domain details with registration, provider, threat, pending state, and detailed mail/website status. `get_domain_details` supersedes the legacy `domain_lookup` summary while retaining the old tool.
- Address geocoding and reverse geocoding; currency and unit conversion; BIN lookup.
- SMS and voice verification codes plus code validation. Telephony charges and account verification restrictions apply.
- Text profanity detection/censoring; user-agent and client-hint lookup; URL metadata and optional page content.
- Downloadable PNG QR/Code 128 codes, HTML rendered as PDF/PNG/JPG, and PNG/JPG image resizing. Downloads contain validated binary responses; structured results contain metadata and download request status and unconfirmed availability. Generating a file may consume API quota even if its download request or later delivery fails. Download availability remains unconfirmed after submission.

## Response handling

Updated tools preserve complete provider JSON in optional `raw` data. Public summary fields retain their existing types. Missing or incompatible required provider values fail explicitly rather than being replaced with invented empty strings, zeroes, or false results. The legacy domain summary handler and schema remain frozen; new workflows should use its detailed replacement.

## Deferred capabilities

HLR lookups, phone playback, bulk database/blocklist downloads, image watermarking, HTML cleaning, and browser automation are not implemented. The integration does not register triggers or webhooks. No operational requests or live verification were performed during this refresh.

## Official documentation

- [API fundamentals and authentication](https://www.neutrinoapi.com/api/api-basics/)
- [API specification](https://www.neutrinoapi.com/api/specification/)
- [Domain lookup](https://www.neutrinoapi.com/api/domain-lookup/)
- [Phone verification](https://www.neutrinoapi.com/api/phone-verify/)
- [Imaging APIs](https://www.neutrinoapi.com/api/html-render/)
