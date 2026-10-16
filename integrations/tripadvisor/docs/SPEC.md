# Tripadvisor API Specification

## Authentication and settings

The Content API sends the primary API key as the `key` query parameter over HTTPS. Language (`en`) and currency (`USD`) retain their existing configurable defaults and per-tool overrides.

Review Express connectivity operations send `X-TripAdvisor-API-Key`. The optional `reviewExpressToken` authentication field allows a separate connectivity key. When absent, existing connections continue to use the saved primary key. The documented property mapping request also includes `key`, as shown by Tripadvisor. Connectivity access requires an approved account, completed hotel mapping, and hotel opt-in. Email requests generally use the partner's mapped property ID, which differs from a Tripadvisor location ID.

## Content API

- `search_locations`: `GET /api/v1/location/search`; keyword, category, phone, address, coordinates, radius, units, and language.
- `search_nearby_locations`: `GET /api/v1/location/nearby_search`; coordinates and optional search filters.
- `get_location_details`: `GET /api/v1/location/{locationId}/details`; language and currency.
- `get_location_reviews`: `GET /api/v1/location/{locationId}/reviews`; language, limit, and offset.
- `get_location_photos`: `GET /api/v1/location/{locationId}/photos`; language, limit, offset, and source. Returns existing photo URL metadata rather than downloading images.
- `map_location`: retains `GET /api/partner/2.0/location_mapper/{latitude},{longitude}` and the `-mapper` API key suffix. Tripadvisor marks this documentation outdated; access remains account dependent and has not been verified live.

Search returns up to ten matches. Reviews and photos have plan-dependent limits; the documentation advertises up to five for standard subscriptions. Tripadvisor now advertises the Terra API platform alongside the Content API; existing routes and contracts are preserved here rather than silently changing APIs or credentials.

## Review Express

- `send_review_request`: `POST /api/partner/1.0/email_requests`; JSON guest batch, limited to 10,000 body characters. Returns actual request IDs, statuses, and provider errors. A queued request is not evidence that an email has already been delivered.
- `manage_review_request`: `PUT` or `DELETE /api/partner/1.0/email_requests/{requestId}`. Success requires the matching provider request ID and actual `updated: 1` or `canceled: 1` acknowledgement. The optional status is returned only when supplied by the provider.
- `list_review_requests`: documented `GET /api/partner/1.0/email_requests`, queried by partner property or partner request reference, or `GET /email_requests/{requestId}`. Returns actual provider records and numeric paging metadata; authentication-bearing paging URLs are not exposed.
- `list_location_mappings`: documented `GET /api/partner/1.0/location_mappings` or `/location_mappings/{partnerId}`, with optional `review_express_opted_in` filter. Returns partner property IDs, Tripadvisor IDs, actual opt-in booleans, and original mapping metadata.
- `check_review_optin`: retains the existing `GET /api/partner/1.0/email_requests/opt_in_status` route and request semantics. This exact route is not confirmed by the current public documentation. Use `list_location_mappings` for the positively documented connectivity mapping capability.

No account/self endpoint or webhook API was found for these products. Hotel availability callbacks, pricing APIs, and advertising APIs are separate partnership products outside this integration's implemented surface.

## Official sources

- [Location search](https://tripadvisor-content-api.readme.io/reference/searchforlocations)
- [Nearby search](https://tripadvisor-content-api.readme.io/reference/searchfornearbylocations)
- [Location details](https://tripadvisor-content-api.readme.io/reference/getlocationdetails)
- [Location reviews](https://tripadvisor-content-api.readme.io/reference/getlocationreviews)
- [Location photos](https://tripadvisor-content-api.readme.io/reference/getlocationphotos)
- [Legacy location mapper](https://developer-tripadvisor.com/content-api/documentation/location_mapper/)
- [Review Express access](https://developer-tripadvisor.com/connectivity-solutions/review-express-api/)
- [Review Express security](https://developer-tripadvisor.com/connectivity-solutions/review-express-api/documentation/security/)
- [Create requests](https://www.developer-tripadvisor.com/apis/review-express/create.html)
- [List requests](https://developer-tripadvisor.com/apis/review-express/list.html)
- [Update requests](https://developer-tripadvisor.com/connectivity-solutions/review-express-api/documentation/update/)
- [Cancel requests](https://developer-tripadvisor.com/connectivity-solutions/review-express-api/documentation/cancel/)
- [Property mappings and opt-in](https://developer-tripadvisor.com/connectivity-solutions/review-express-api/documentation/check-opt-in-status/)
- [Provider errors](https://developer-tripadvisor.com/connectivity-solutions/review-express-api/documentation/errors/)
