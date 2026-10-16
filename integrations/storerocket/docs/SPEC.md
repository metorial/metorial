# StoreRocket integration specification

## Authentication

Location API access requires the Business plan. Create a V2 token at **Dashboard → API Tokens** and store the value when shown. Tokens authorize the account's projects and need `location:read` for location reads or `location:update` for updates. Requests use `Authorization: Bearer <token>` and `Accept: application/json` against `https://storerocket.io/api/v2/`. JSON writes also use `Content-Type: application/json`. Blank tokens are rejected and surrounding whitespace is trimmed.

## Tools and API coverage

| Tool | API route | Behavior |
| --- | --- | --- |
| `get_account_info` | `GET /user` | Reads the authenticated user profile and returns the complete response. |
| `list_projects` | `GET /projects` | Returns the authorized project-list response for discovering public string IDs. |
| `list_project_locations` | `GET /projects/{projectId}/locations` | Returns the complete location-list response for a project ID from `list_projects`. |
| `update_location` | `PATCH /projects/{projectId}/locations/{locationId}` | Updates selected name, city, phone, visibility, or weekday hours. IDs come from the project tools. Returns the complete update response. |
| `find_locations` | `GET /locations` | Retains the original, undocumented V2 location call and optional search/geographic/pagination inputs. |
| `list_users` | `GET /users` | Retains the original, undocumented V2 user-list call and optional numeric limit/offset inputs. |
| `health_check` | `GET /ping` | Retains the original, undocumented V2 ping; returns `healthy: false` on failure. Successful ping does not establish project access. |

The current reference confirms the first four routes. It does not list `/api/v2/locations`, `/api/v2/users`, or `/api/v2/ping`. Their runtime availability remains unverified; existing keys, inputs, parameter forwarding, and output contracts remain intact for compatibility. The documented V1 location route is `/api/locations`, uses a separate legacy token, and supports page/limit rather than the original tool's geographic/query/offset inputs. The retained `find_locations` call is not silently changed into that different V1 contract.

No project ID is required in connection configuration. The new project tools use public string IDs and add no unconfirmed location filters. Existing raw outputs and new provider responses preserve identifiers, provider envelopes, and nulls without guessed normalization. No existing output field becomes optional and no normalized nullable scalar fields are introduced.

## Partial updates

`update_location` sends only supplied fields. At least one update field is required at runtime. Omitted fields keep their saved values; `visible: false` is retained. Supplied name/city must be nonblank and at most 255 characters. `phone: null` clears the phone. Hours accept selected short weekday keys `mon` through `sun`, with a string such as `09:00-17:00`, `closed`, or null to clear one day. Empty hours preserve the schedule, omitted days are unchanged, and `hours: null` removes the schedule association. Null is not accepted for name, city, or visibility.

A valid PATCH returns HTTP 200 with the updated location; HTTP 422 field errors reject the whole update. The full response is returned under `location` without stripping its provider `data` wrapper. Other documented PATCH fields and create/delete operations remain outside this conservative tool surface; no PUT replacement semantics are inferred.

## Errors and transport

Requests use a 30-second timeout. Token/ID validation and upstream HTTP failures produce structured service errors. Error mapping preserves HTTP status and extracts body messages and field validation arrays even from SDK-wrapped failures. The health-check tool retains its existing false-on-request-failure behavior. The documented V2 statuses include 401 for invalid auth, 403 for unavailable API access/permission, 404 for inaccessible resources, 422 for invalid input, and 429 for rate limiting. Requests are not retried automatically.

## Official sources

Audited 2026-10-15 with a fresh read after review:

- [Current API overview](https://docs.storerocket.io/api/introduction)
- [Authentication and token permissions](https://docs.storerocket.io/api/authentication)
- [Authenticated user profile](https://docs.storerocket.io/api/user)
- [Partial location updates](https://docs.storerocket.io/api/locations/update)
- [Legacy V1 contract](https://docs.storerocket.io/api/legacy)
- [Legacy V1 locations](https://docs.storerocket.io/api/legacy-locations)
- [REST API help guide](https://help.storerocket.io/en/articles/5579248-how-to-use-the-rest-api)

No live account requests were made. Token validity, runtime responses, update acceptance, permissions, and the three undocumented inherited V2 endpoints remain unverified.
