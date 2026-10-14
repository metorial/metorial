# Ahrefs API Specification

## Authentication

API keys use `Authorization: Bearer <token>` with API v3. Workspace owners and admins create keys in Account Settings → API keys. Availability and quotas depend on the subscription plan.

Ahrefs Connect uses authorization-code OAuth with PKCE. Authorization uses `https://app.ahrefs.com/web/oauth/authorize`; the code exchange uses `https://ahrefs.com/oauth/token` with a form-encoded body. Access tokens expire after one year. No refresh tokens are issued: users must reconnect after expiry. New production Connect apps require provider approval and activation.

## Reports

Site Explorer tools expose domain metrics, backlinks, referring domains, anchors, organic keywords and competitors, top pages, linked domains, country metrics, and historical reports. Keyword tools expose overview metrics, matching and related terms, and search-volume reports. The SERP tool retrieves ranking URLs and SEO metrics. Optional `select` values choose provider fields; common fields are supplied for the refreshed reports when omitted.

Batch analysis uses `POST /v3/batch-analysis/batch-analysis`, with 1–100 structured targets and an array of selected metrics. The public `targets` input remains a list of domain or URL strings. Optional `mode` and `protocol` apply to every target. The existing optional `date` remains the requested snapshot date, defaulting to today. The current provider endpoint has no date-selection parameter and cannot fulfill historical snapshots; requests for a date other than today receive an explicit unsupported-date error instead of current data. No supported legacy historical batch request was verified.

`get_limits_and_usage` returns the API key expiration, subscription, nullable unit limits, usage, and billing reset date.

The existing Rank Tracker, Site Audit, Brand Radar, and management tools retain their public contracts. Their full current-API request compatibility is outside this focused refresh; check endpoint-specific required inputs against the current reference before relying on these branches.

## Limits

Most paid reports cost at least 50 API units. Ahrefs documents a default limit of 60 requests per minute; throttling can also return HTTP 429. Endpoint access, Brand Radar indexes, and historical data depend on the subscription.

Ahrefs removed `offset` from many API endpoints in 2024. Existing optional offset inputs remain for compatibility, but callers must check the endpoint documentation: they are not a reliable pagination mechanism for those endpoints. Site Audit Page Explorer has its own documented offset support.

## Official sources

- [API overview](https://docs.ahrefs.com/en/api/docs/introduction)
- [Full OpenAPI specification](https://docs.ahrefs.com/openapi.json)
- [OAuth guide](https://docs.ahrefs.com/en/ahrefs-connect/docs/oauth-guide)
- [Batch analysis](https://docs.ahrefs.com/en/api/reference/batch-analysis/post-batch-analysis)
- [Keywords overview](https://docs.ahrefs.com/en/api/reference/keywords-explorer/get-overview)
- [API changelog](https://docs.ahrefs.com/en/api/docs/changelog)
