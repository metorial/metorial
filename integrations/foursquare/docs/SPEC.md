# Foursquare API specification

## Product and credentials

This integration exposes Places discovery, place content, geotagging, and place-data suggestions, plus the V2 OAuth current-user profile. It does not claim the other Foursquare products as implemented features. API versions are one Places product; user identity is a shared uncategorized utility.

- `service_api_key`: current Places Service API Key, stored with an explicit service-key credential type. Requests use `https://places-api.foursquare.com`, `Authorization: Bearer <key>`, and `X-Places-Api-Version: 2025-06-17`.
- `api_key`: original legacy V3 API key. Its existing output remains unchanged.
- `oauth`: original V2 OAuth authorization-code flow and `/v2/users/self` profile request. Existing endpoints, token output, and permissions remain unchanged. No refresh token or expiry is invented; the documented web flow returns an access token, and current Places third-party auth documentation describes permanent access tokens. Current Places tools deliberately require service-key auth instead of assuming old OAuth tokens are current API credentials.

No account or workspace identifier is required in connection config. Saved credentials without the new service-key type retain their existing legacy interpretation. There is no fabricated identity endpoint for a service key.

## Current tools

| Tool | Operation | Notes |
| --- | --- | --- |
| `search_places_current` | GET `/places/search` | Category/chain IDs use `fsq_category_ids`/`fsq_chain_ids`; uppercase sort; `open_at` uses local DOWTHHMM. Omitted location permits provider IP biasing. |
| `get_place_details_current` | GET `/places/{fsq_place_id}` | Optional field selection; full provider record retained. |
| `autocomplete_places_current` | GET `/autocomplete` | At least three query characters; place/search/geo types, bias and optional billing session token. |
| `match_place_current` | GET `/places/match` | Requires name, street address, city and country; sends `postal_code`. Provider currently documents English-speaking countries. |
| `get_place_photos_current` | GET `/places/{fsq_place_id}/photos` | Preserves photo metadata and original URLs; provides downloadable images when prefix/suffix are present. |
| `get_place_tips_current` | GET `/places/{fsq_place_id}/tips` | Preserves tip fields and IDs; supports field selection. |
| `get_geotagging_candidates` | GET `/geotagging/candidates` | Intended for device location tagging; exposes `X-Fsq-Request-Id` for confirmation. |
| `confirm_geotagging_selection` | POST `/geotagging/confirm` | Sends request ID, selected place ID, context and delayed flag as query parameters. |
| `suggest_place_changes` | POST `/places/{fsq_place_id}/suggest/{edit,remove,merge,flag}` | Query parameters, explicit branch requirements, optional `dryRun`. Does not claim an edit was accepted or manufacture a status. |
| `suggest_new_place` | POST `/places/suggest/place` | Matching may return an existing place; actual result and errors preserved. |
| `get_suggestion_status` | GET `/places/suggest/status` | Optional comma-separated `suggested_edit_ids`, limit 0–50; omission lists calling token's suggestions. |
| `get_current_user` | GET `/v2/users/self` | V2 OAuth identity, original `oauth_token` and `v=20231010` semantics. |

All current tools preserve the unmodified provider body in `response`. Rich attributes may require the provider's paid tier. Limits, sorting, and field selection are provider-controlled; no undocumented next-page cursor or offset is synthesized. Suggestion operations submit when `dryRun` is omitted; `dryRun: true` previews. HTTP success can still contain suggestion-level errors or unresolved statuses; inspect `response`.

## Legacy compatibility

The provider [announces V3 deprecation on May 15, 2026](https://docs.foursquare.com/developer/reference/upcoming-changes). Existing schemas, keys, output fields, enum values, defaults, falsy-value behavior, request bodies and client paths are retained. This includes pre-existing request limitations and validation behavior. Replacement tools have distinct keys and current contracts.

| Legacy tool | Replacement |
| --- | --- |
| `search_places` | `search_places_current` |
| `get_place_details` | `get_place_details_current` |
| `autocomplete_places` | `autocomplete_places_current` |
| `match_place` | `match_place_current` |
| `get_place_photos` | `get_place_photos_current` |
| `get_place_tips` | `get_place_tips_current` |
| `find_nearby_places` | `get_geotagging_candidates` |
| `submit_place_feedback` | `suggest_place_changes` |
| `get_feedback_status` | `get_suggestion_status` |

V2 user APIs and Personalization use separate credentials and contracts. The V3 notice is not a V2 retirement notice. Managed-user refresh, enterprise current OAuth, geofences, Studio, Measurement, partner ingestion, batch processing and webhooks are outside this integration's implemented surface.

## Official references

- [Places authentication](https://docs.foursquare.com/fsq-developers-places/reference/authentication)
- [Service key setup](https://docs.foursquare.com/developer/docs/manage-service-api-keys)
- [Place search](https://docs.foursquare.com/fsq-developers-places/reference/place-search)
- [Place details](https://docs.foursquare.com/fsq-developers-places/reference/place-details)
- [Autocomplete](https://docs.foursquare.com/fsq-developers-places/reference/autocomplete)
- [Place match](https://docs.foursquare.com/fsq-developers-places/reference/place-match)
- [Photos](https://docs.foursquare.com/fsq-developers-places/reference/place-photos) and [tips](https://docs.foursquare.com/fsq-developers-places/reference/place-tips)
- [Geotagging candidates](https://docs.foursquare.com/fsq-developers-places/reference/geotagging-candidates) and [confirmation](https://docs.foursquare.com/fsq-developers-places/reference/geotagging-confirm)
- [Edits](https://docs.foursquare.com/fsq-developers-places/reference/place-suggest-edit), [removals](https://docs.foursquare.com/fsq-developers-places/reference/place-suggest-remove), [merge](https://docs.foursquare.com/fsq-developers-places/reference/suggest-merge), [flags](https://docs.foursquare.com/fsq-developers-places/reference/place-flag), [new place](https://docs.foursquare.com/fsq-developers-places/reference/places-suggest-place), [statuses](https://docs.foursquare.com/fsq-developers-places/reference/place-suggest-status)
- [V2 OAuth setup](https://docs.foursquare.com/developer/docs/using-oauth-authentication), [Personalization auth](https://docs.foursquare.com/developer/reference/personalization-apis-authentication), [current user](https://docs.foursquare.com/developer/reference/get-user-details)
