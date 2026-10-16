# L2S integration specification

## Authentication and configuration

The API uses `Authorization: Bearer <api_key>` at `https://api.l2s.is`.
The existing API-key setup points to `https://app.l2s.is/integrations`.
There are no additional connection settings or OAuth scopes. Authentication
retains its existing profile lookup through the user-settings endpoint.

## Tools

| Tool | Request | Behavior |
| --- | --- | --- |
| `shorten_url` | `POST /url` | Create a shortened URL with its destination, optional custom key, title, tags, and five UTM parameters. |
| `get_url` | `GET /url/{id}` | Read provider metadata for a shortened URL. |
| `update_url` | `PUT /url/{id}` | Retain the existing destination, tag, and UTM update request. Only supplied fields are sent. |
| `get_user_settings` | `GET /user/setting` | Retain the existing account-settings lookup and raw fallback response. |

The first two requests match the published
[shorten reference](https://docs.l2s.is/) and
[URL details reference](https://docs.l2s.is/api-8021272).
The shortening example documents `url`, `customKey`, `utmSource`, `utmMedium`,
`utmCampaign`, `utmTerm`, `utmContent`, `title`, and `tags`. Both published
success examples have `ok`, `response.message`, and `response.data`; their
metadata examples are generic objects, so the integration preserves raw data
without requiring undocumented IDs, counts, titles, or link fields.

The update and settings routes remain for existing connections. Their exact
contracts could not be independently retrieved from the accessible public
reference. Missing documentation does not establish that these routes are
retired. The raw settings result remains available under `settings`.

## Responses and errors

The three URL tools retain `ok`, `message`, and `urlData` outputs. Messages come
from the provider. Link metadata is returned unchanged, including null or sparse
values; the integration does not construct a link URL from a metadata key.
HTTP errors retain provider status and nested response messages. An explicit
`ok: false` envelope is treated as a failure, including when returned with HTTP
200. A URL response missing the existing boolean status, string message, or
defined `response.data` field is
reported as an invalid provider response rather than given invented values.

## Capability and verification limits

No additional same-provider endpoints for listing/deleting links, analytics,
QR-code generation, domains, teams, or webhook registration were confirmed.
The integration does not advertise those capabilities. Other products named
L2S, including `l2s.app` and the Collabor8 L2S API, use different APIs and are
not part of this integration.

The official references were available through indexed documentation during
the audit; direct page retrieval returned gateway errors. No live provider
operations or credential checks were performed.
