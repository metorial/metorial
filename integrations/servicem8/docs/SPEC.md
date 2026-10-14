# ServiceM8 integration

The integration provides 19 tools for jobs, clients and contacts, scheduling, staff discovery, job line items, notes, payments, catalog discovery and account identity. It does not expose all ServiceM8 API resources.

## Authentication

Private applications send an API key in `X-API-Key`. Public applications use OAuth 2.0: authorize at `https://go.servicem8.com/oauth/authorize`, then exchange or refresh tokens at `https://go.servicem8.com/oauth/access_token`. Access tokens expire after one hour. Refresh preserves the existing refresh token if no replacement is returned.

The OAuth method requests only scopes used by these tools: `create_jobs`, `manage_jobs`, `manage_customers`, `manage_customer_contacts`, `read_staff`, `manage_schedule`, `manage_job_materials`, `manage_job_payments`, `publish_job_notes`, `read_inventory` and `vendor`. Existing OAuth connections may require renewed consent for newly added scopes. Existing API-key connections are recognized when their output has only a token and no OAuth expiration or refresh metadata. OAuth output with either metadata field retains Bearer authentication.

## API contracts

The base URL is `https://api.servicem8.com/api_1.0`. Records use GET for reads, POST for creation and updates, and DELETE for deletion. Creation returns a stable UUID via `x-record-uuid`. List operations start with `cursor=-1` and follow `x-next-cursor` until absent.

Jobs use `job_description` and `purchase_order_number`; creation supplies a Quote status when omitted. Company contacts use `is_primary_contact` and optionally `type` (for example JOB or BILLING). Job materials use `price` for the ex-tax unit price and require quantity on creation. Payments use `method` and `timestamp`; a supplied date alone becomes midnight in the account timezone. Scheduled bookings explicitly set `activity_was_scheduled=1` and `activity_was_recorded=0`.

Job-material listing can filter a job or list across the account when jobUuid is omitted. Adding a material still requires a job UUID.

The old dueDate, jobTitle and job-material description input fields remain present for compatibility, but return clear errors because the corresponding write contracts do not support them. A booking can succeed while its separate allocation fails; `schedule_job` then returns `activityUuid` and `allocationError` so the caller can avoid duplicate bookings.

No triggers are registered.

## Official references

- [Authentication and scopes](https://developer.servicem8.com/docs/authentication)
- [Pagination](https://developer.servicem8.com/docs/pagination)
- [Jobs](https://developer.servicem8.com/reference/createjobs)
- [Clients](https://developer.servicem8.com/reference/createclients)
- [Company contacts](https://developer.servicem8.com/reference/createcompanycontacts)
- [Job materials](https://developer.servicem8.com/reference/createjobmaterials)
- [Job payments](https://developer.servicem8.com/reference/createjobpayments)
- [Job activities](https://developer.servicem8.com/reference/createjobactivities)
- [Account identity](https://developer.servicem8.com/reference/listvendors)
- [Materials catalog](https://developer.servicem8.com/reference/listmaterials)
