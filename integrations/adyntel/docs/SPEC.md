# Adyntel integration reference

Audited against the official API documentation on 2026-10-15. All API operations use JSON POST requests to `https://api.adyntel.com`.

## Connection

The `api_key_email` authentication method accepts `apiKey` and account `email` and retains the existing `{ token, email }` auth output. Each request sends `api_key` and `email` in its JSON body. The endpoint request examples establish the body format despite the authorization overview's reference to a query string. API keys do not require OAuth refresh. There are no connection settings or required opaque IDs. The researched documentation does not expose a suitable current-account identity endpoint.

Source: [authorization](https://docs.adyntel.com/authorization).

## Tools

| Tool key | Endpoint | Behavior |
| --- | --- | --- |
| `lookup_meta_ads` | `/facebook` | One company domain or Facebook page URL; continuation token; media, country, activity, language, special-category filters and video UGC classification. |
| `search_meta_ads` | `/facebook_ad_search` | Keyword and optional country; grouped provider results become a flat summary list. |
| `lookup_google_ads` | `/google` | Company domain; media, country, continuation token, optional text extraction. Repeat the country filter on every page. |
| `lookup_linkedin_ads` | `/linkedin` | Company domain or numeric page ID; continuation token; date preset or custom dates; optional EU impression data. |
| `lookup_google_shopping_ads` | `/google_shopping`, `/google_shopping_status` | Submit and check up to ten times at three-second intervals. Return the request ID even if results are still unavailable. |
| `submit_google_shopping_search` | `/google_shopping` | Submit once and return the real request ID immediately. |
| `get_google_shopping_status` | `/google_shopping_status` | Read an existing search by request ID without another charged submission. |
| `search_tiktok_ads` | `/tiktok_search` | Keyword and optional supported European country code or `ALL`; returns string ad IDs. |
| `get_tiktok_ad` | `/tiktok_ad_details` | Retrieve an ad using its exact string ID, preserving creative type and advertiser details. |
| `get_tiktok_ad_details` | `/tiktok_ad_details` | Deprecated numeric-ID tool. Existing input/output schemas and handler remain intact; use `get_tiktok_ad` for new workflows. |
| `analyze_keywords` | `/domain-keywords` | Domain-level organic and paid position, traffic, budget, and CPC metrics. |

Official endpoint references: [Meta](https://docs.adyntel.com/ad-libraries/meta), [Meta keyword search](https://docs.adyntel.com/ad-libraries/meta-ad-search), [Google](https://docs.adyntel.com/ad-libraries/google), [LinkedIn](https://docs.adyntel.com/ad-libraries/linkedin), [Shopping submission](https://docs.adyntel.com/ad-libraries/google-shopping), [Shopping status](https://docs.adyntel.com/ad-libraries/google-shopping-status), [TikTok search](https://docs.adyntel.com/ad-libraries/tiktok-search), [TikTok details](https://docs.adyntel.com/ad-libraries/tiktok-ad-details), [keyword metrics](https://docs.adyntel.com/ad-libraries/paid-vs-organic-keywords).

## Validation and responses

Domains are normalized by removing an HTTP(S) prefix and leading `www.`; paths and empty domains are rejected. Meta and LinkedIn requests require exactly one company target. A Meta political-category filter requires US, and UGC classification requires video media. LinkedIn custom dates must form a valid `YYYY-MM-DD` range ending before today, spanning no more than 364 days. Impression data cannot be combined with date filters.

Existing public keys, types, enums, and requiredness remain compatible. New filters and `rawResponse` fields are additive. Summaries map documented provider field names to the existing output names, retain nullable continuation tokens, and omit values that cannot satisfy their existing optional schemas. Complete original objects and nulls remain in `rawResponse`. Missing count, state, or timestamp data is never replaced with invented values. The deprecated numeric TikTok tool retains its original response mapping for compatibility.

A 204 response is treated as no provider data. HTTP and provider error responses become structured service failures. Ordinary creative URLs remain research metadata, not downloaded files.

## Costs and boundaries

Successful requests generally cost one credit; Google text extraction and LinkedIn impression data cost two. Shopping status requests are free. Unavailable Shopping results are reported as unavailable, without inventing a completion state.

The API documents outbound result webhooks and unattended all-page jobs, but no authenticated subscription lifecycle or webhook signature contract. This integration uses direct responses and explicit pagination. No triggers are registered. Callback fan-out, unbounded all-page jobs, and multi-country webhook batches are outside this practical synchronous surface.
