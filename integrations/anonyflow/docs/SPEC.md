# AnonyFlow cloud API integration

Official sources checked on 2026-10-15:

- [Published API reference](https://documenter.getpostman.com/view/12641271/TVCjvkLG)
- [Current product website](https://anonyflow.com/)

## Authentication and requests

Requests target `https://api.anonyflow.com` and send the configured API key in
`x-api-key`. JSON requests use `Content-Type: application/json`. Authentication
has no OAuth scopes, refresh flow, tenant identifier, or global configuration.
Blank API keys fail with a service error. Requests time out after 30 seconds.

## Tool coverage

| Tool | Method and path | Request |
| --- | --- | --- |
| `protect_value` | `POST /anony-value` | `{ data: sensitiveValue }` |
| `unprotect_value` | `POST /deanony-value` | `{ data: encryptedValue }` |
| `protect_data` | `POST /anony-packet` | `{ data: fields, keys }` |
| `unprotect_data` | `POST /deanony-packet` | `{ data: protectedFields, keys }` |
| `check_connection` | `GET /test` | No body |

The API also accepts string arrays at both value endpoints. The current value
tools intentionally retain scalar string inputs; array input is not exposed.
No identity endpoint, pagination, webhook, or file download contract is
documented in this reference.

## Responses and chaining

Transformation responses contain `status: true` and a `value` containing the
processed data. The connection check returns `status: true` without a required
`value`. A false status fails with a service error, as do malformed success
responses. HTTP failures retain the provider response body and status in the
shared error mapping.

For compatibility, the original `protect_value.encryptedValue`,
`protect_data.protectedFields`, and `unprotect_data.fields` outputs remain full
provider response objects. New direct outputs are `protect_value.value` and
both packet tools' `values`. Pass `protect_value.value` to
`unprotect_value.encryptedValue`, or `protect_data.values` to
`unprotect_data.protectedFields`. New tools also return the full response under
`response`.

For packets, a non-empty `keys` array selects named fields. An empty array
processes every field. The provider documents the literal string `Error` for a
field whose decryption fails. Preserve that value and inspect packet results;
an accepted response does not establish that every field was decrypted. The
same plaintext string could be legitimate data, so no failure classification
is inferred from that string alone.

## Product boundary and verification limits

The published reference contains cloud encryption APIs, with examples dated
2020. The current website promotes local document redaction products. Public
documentation alone does not establish continued cloud endpoint availability,
current account enrollment, or API key issuance. No replacement cloud endpoint
was found, and the documented existing base URL remains unchanged.

This integration does not implement the separate document redaction products,
data deletion, sharing administration, or encryption key management. No live
provider requests, E2E suites, or tool-use evals were run for this refresh.
