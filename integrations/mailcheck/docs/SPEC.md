# Mailcheck Integration Specification

Mailcheck verifies individual email addresses and mailing lists, returning trust scores and delivery signals when available.

## Authentication

Create an API key from the API section of the Mailcheck dashboard. Requests use `Authorization: Bearer YOUR_API_KEY` against `https://api.mailcheck.co/v1`.

## Tools

| Tool | Provider route | Behavior |
| --- | --- | --- |
| `verify_email` | `POST /singleEmail:check` | Send `{ email }` and return available trust, MX, SMTP, disposable, catch-all, and social profile signals. |
| `create_batch_check` | `POST /emails:check` | Send a non-empty `{ emails }` list and return the operation name and available progress metadata. |
| `get_batch_operation` | `GET /emails/{operation_name}` | Return progress, failure details, and the results file when a completed operation has a download URL. |
| `list_operations` | `GET /emails/operations` | List operations using `page_size` and `page_token`, preserving `nextPageToken`. |

The operation response requires `name`; omitted `done` is reported as false. Failed operations expose `result.error.code` and `result.error.message`. Successful results expose `result.response.url`. Optional verification signals are omitted when the provider does not return them. Existing result URL fields remain available for compatibility.

A trust score of 0–49 indicates a risky address; 50–100 indicates a valid address according to Mailcheck. Verification consumes the account's allowance.

## Sources

- [Official API documentation](https://app.mailcheck.co/docs)
- [Official OpenAPI document](https://app.mailcheck.co/openapi.json)
- [API key creation](https://mailcheck.co/create-api-key)
- [Trust score and download guidance](https://mailcheck.co/faq)

The public OpenAPI document exposes these four endpoints and no account identity endpoint or webhook subscription API. This refresh was checked against documentation and local builds; no live provider verification was performed.
