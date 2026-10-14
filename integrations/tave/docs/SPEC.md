# Tave API specification

Tave, now VSCO Workspace, provides a studio CRM for contacts, leads, jobs, scheduling, orders, and payments.

## Official documentation

- [Public API guide](https://help.workspace.vsco.co/en/articles/13259288-public-api)
- [API reference](https://workspace.vsco.co/api)
- [Official OpenAPI document](https://workspace.vsco.co/api/v2/openapi.json)
- [Legacy contact form guide](https://help.workspace.vsco.co/en/articles/13252315-using-contact-form-7)
- [Provider-authored legacy submission source](https://plugins.svn.wordpress.org/tave-cf7-integration/trunk/tave_cf7.php)

## Authentication and requests

Public V2 uses an API key from Settings › API Integrations. The current base URL is `https://workspace.vsco.co/api/v2`; the OpenAPI document also lists `https://tave.io/v2` as a legacy server. Keys are accepted in `X-API-KEY` or as a bearer token. Read-only keys can retrieve data; creation needs read-and-write permission.

Legacy New Lead API uses Secret Key and Studio ID from Settings › API Integrations › Legacy New Lead API. The provider plugin posts form-encoded fields to `https://workspace.vsco.co/webservice/create-lead/{studioId}`. It sends `SecretKey` in the body and `X-Tave-No-Email-Notification: true` to suppress notification. A trimmed response body of `OK` confirms success. Field names are case sensitive; `JobType` must match a configured name. Unknown legacy fields can become custom fields.

## Tool mapping

| Tool | Official operation and behavior |
| --- | --- |
| `create_contact` | `POST /address-book`; `kind`, camelCase person/company/location fields, structured phone fields, and custom-field `{fieldId, value}` arrays |
| `search_contacts` | `GET /address-book` for lists; `GET /search?scope=contact&q=...` and `GET /address-book/{id}` for hydrated searches; contact-kind and brand filters are applied locally |
| `create_job` | `POST /job` with resolved `jobTypeId`, `brandId`, `leadSourceId`, `stage`, `eventDate`, `leadNotes`, and custom fields; optional existing contact via `POST /job-contact`; optional scheduled event via `POST /event` |
| `get_brands` | `GET /brand`, all pages |
| `get_orders` | `GET /order`; optional brand/job-type filters use related jobs from `GET /job?includeClosed=true` before local pagination |
| `get_payments` | `GET /payment`; optional brand/job-type filters use related jobs from `GET /job?includeClosed=true` before local pagination |
| `get_studio` | `GET /studio/me`, authenticated studio identity and settings |
| `get_job_types` | `GET /job-type`, including documented hidden/external-mapping filters |
| `get_jobs` | `GET /job`, including documented closed/external-mapping filters |
| `create_lead` | Legacy form submission with explicit success confirmation |

Public collections expose `items` and `meta.currentPage`, `meta.totalPages`, and `meta.totalItems`. Public list pagination uses `page` and `pageSize` (10–100 rows); search supports 1–100 rows. Existing `perPage` inputs map to `pageSize`. Searches and locally filtered results accept 1–100 results per returned page.

Paginated responses must include valid count and page metadata. A missing or inconsistent result raises an error instead of returning an incomplete collection as complete. Custom-field discovery is the documented unpaginated exception: it uses `canApplyTo=contact` or `job`, while each returned field's `canApplyTo` value is `Contact` or `Job`.

Brand, job type, job role, event type, and lead source inputs resolve exact configured names or IDs. Ambiguous names fail with a request to use an ID. `individual` and `business` contact kinds remain accepted aliases for `person` and `company`. Company and location creation require the optional `name` input. A company's first/last name inputs describe its primary contact.

Job stages are `lead`, `booked`, `fulfillment`, and `completed`. Event inputs map to `startDate`, `startTime`, `endDate`, `endTime`, `timezoneName`, and `typeId`. A job role requires an existing contact ID. Related creation failures identify the already-created job rather than reporting complete success.

All existing tool keys and input/output types remain available. Existing `raw` and legacy `response` fields retain actual provider values. Existing monetary outputs retain the provider's numeric values without rescaling. HTTP/provider and local validation failures use structured service errors.

## Verification boundary

This specification is grounded in the official public OpenAPI document and provider-authored legacy plugin source. No live account or provider mutation was used for the refresh. Large filtered collections and searches can require many API calls, and multi-request job creation can partially succeed. API acceptance, rate limits, and live legacy submissions require separate account verification.
