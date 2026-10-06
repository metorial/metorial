# Deel API scope

The integration exposes 17 public tools covering token identity, contractor contracts, workforce reads, organization reference data, contractor timesheets, invoice adjustments, time off, billing reads, invoice PDFs and EOR estimates. It does not expose broader payroll, HR administration, immigration, IT, SCIM or event subscription APIs.

Requests use `https://api.letsdeel.com/rest` or the existing demo server listed by the official specification, with `X-Version: 2026-01-01`. The public sandbox guide currently lists a different staging server; existing demo connections are preserved. Stable people and payment endpoints have announced newer beta variants and future sunset dates; this integration does not opt into beta behavior.

Authentication uses bearer API tokens or OAuth access tokens with `x-client-id`. OAuth exchanges and refreshes use HTTP Basic credentials and form-encoded bodies at `https://app.deel.com/oauth2/tokens`. Redirect URI is retained for new connections; legacy saved connections without it retain their prior refresh payload. Rotated refresh tokens replace the previous token, and omission preserves the stored value.

| Domain | Official API operations |
| --- | --- |
| Identity | `GET /people/me`, `GET /organizations` |
| Contracts | `GET/POST /contracts`, `GET /contracts/{contract_id}`, `POST /contracts/{contract_id}/amendments`, `/signatures`, `/terminations` |
| People | `GET /people`, `GET /people/{worker_id}/personal` |
| Organization | `GET /legal-entities`, `/teams`, `/departments` |
| Timesheets | `GET /contracts/{contract_id}/timesheets`, `POST /timesheets`, `GET/DELETE /timesheets/{timesheet_id}`, `POST /timesheets/{timesheet_id}/reviews` |
| Invoice adjustments | `GET/POST /invoice-adjustments`, `GET /contracts/{contract_id}/invoice-adjustments`, `GET/DELETE /invoice-adjustments/{id}`, `POST /invoice-adjustments/{id}/reviews` |
| Time off | `GET /time_offs/profile/{hris_profile_id}`, `/policies`, `GET/POST /time_offs`, `PATCH/DELETE /time_offs/{time_off_id}` |
| Billing | `GET /invoices`, `GET /payments`, `GET /invoices/{id}/download` |
| EOR estimates | `GET /eor/validations/{country_code}`, `POST /eor/employment_cost` |

Contracts use `after_cursor`; people use offset/limit; invoices expose offset and cursor metadata; payments return `data.rows`, `has_more` and `next_cursor`; time off returns `data`, `next` and `has_next_page`. The personal identity response is unwrapped. Time-off creation returns an unwrapped `time_offs` array, updates return `time_off`, and cancellation acknowledges HTTP 204 before an independent retained-state check.

Timesheet and adjustment deletion require `data.deleted: true` and a subsequent exact-resource 404. Time-off cancellation requires the retained record to report `CANCELED`. These operations have different lifecycle semantics.

Invoice PDFs are delivered as downloadable files. Their provider URLs expire at the returned `expires_at`; renewing a file requests fresh download details for the same invoice. Signed URLs are not public output fields. Missing/expired download metadata fails explicitly.

Source: [official OpenAPI](https://api.letsdeel.com/openapi/rest/definitions), [versioning](https://developer.deel.com/api/stable/api-versioning), [authentication](https://developer.deel.com/api/stable/authentication), [OAuth](https://developer.deel.com/api/stable/oauth), [sandbox](https://developer.deel.com/api/stable/sandbox), [employment calculator](https://developer.deel.com/api/employer-of-record/employment-cost-calculator).
