# Memberspot integration specification

Manage members, offer access, learning progress, custom properties, and exam results through the Memberspot REST API.

## Authentication

Create an API key in Memberspot **Settings > API keys** (`/settings/apikeys`). Requests send it in the `X-API-KEY` header. API operations use `https://api.memberspot.de/v1`; the connected-school identity endpoint is `GET https://api.memberspot.de/api-auth`.

API keys do not use OAuth or token refresh. Endpoint availability can depend on your account entitlement; check with Memberspot if a request is denied.

## Discovery and member workflows

- `get_school` returns the school associated with the API key, preserving the provider response without inventing identity fields.
- `list_users` returns one page of users, optionally filtered by offer, course, and active state. A course filter populates that course's progress. Pass `nextPage` as `lastLoadedId` to continue; `pageLength` is between 1 and 100.
- `find_user` finds a member by email. A missing member returns a clear error because the tool's user output is an object.
- `grant_access` creates a member if needed and grants an offer. Discover offer IDs with `list_offers`; provide the order ID used to track access.
- `manage_access` activates or deactivates access by offer or order. `delete_access` removes the matching assignment by omitting the API's `active` property. Offer scope affects all matching offers; order scope affects all accesses with the same order ID for that member.
- `set_offer_expiration` sets an ISO 8601 expiry date for a user's offer, or removes it when the date is omitted or null. Find user UIDs with `find_user` or `list_users`.
- `delete_users` permanently deletes members using between 1 and 10 email addresses. Unknown users are ignored. The provider's raw response is retained; a scalar acknowledgement is also exposed under `result.status`.

## Courses, exams, and custom properties

- `list_courses` discovers course IDs, names, types, and available descriptions.
- `get_course_progress` returns the provider's full progress response for a specific course or one page across courses. For list calls, use `pageLength` and `lastLoadedCourseId`; pass the response's `nextPage` cursor to continue. Provider progress metrics and optional timestamps remain unchanged.
- `enable_chapter_access` unlocks a chapter for a member. Discover course IDs with `list_courses`; obtain chapter IDs from course settings because the reviewed REST definition contains no chapter-list endpoint.
- `list_exams` discovers exam IDs and metadata. `get_exam_results` returns one page of submissions, including complete run records. Pass `nextPage` as `lastLoadedId` to continue; `pageLength` is between 1 and 100.
- `manage_custom_properties` lists property definitions when called without email or properties. To update a user, supply both email and at least one property. The public `propertyId` input maps to the API's `id` field. Definitions retain select options and other provider metadata.
- `get_login_token` generates a token valid for one hour. It exposes the provider's direct `loginUrl` when present. Treat tokens and login URLs as credentials.

## API behavior and limits

HTTP failures and invalid input combinations produce structured service errors. Requests have a 30-second timeout. The official definition documents a limit of four requests per second on user, progress, custom-property update, and exam-result endpoints; callers should pace requests and handle rate-limit errors.

Existing output field types remain intact. Paginated list tools expose optional cursors and preserve the complete response under `raw`; progress already returns the complete response. No tool downloads or generates files.

Memberspot advertises webhooks, but the reviewed public REST definition supplies no webhook registration or callback-verification contract. This package currently provides tools without triggers.

## Official reference

Reviewed 2026-10-15: [Memberspot API documentation](https://api.memberspot.de/api), using its [published OpenAPI definition](https://api.memberspot.de/api/swagger-ui-init.js). The definition covers the implemented routes, request DTOs, response DTOs, authentication, and pagination.
