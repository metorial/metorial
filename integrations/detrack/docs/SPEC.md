# Detrack API coverage

The integration uses Detrack API v2 with an API key in the `X-API-KEY` header.
Generate a key under **Integrations > API Key** in the Detrack dashboard. Use a
sub-user key when its permissions should be restricted. Connection setup does
not require a separate account or workspace identifier.

## Jobs

- `create_job` creates one delivery or collection with a date, D.O. number and
  address. It supports contacts, driver assignment, schedule, payment details,
  dimensions, notification settings and line items.
- `update_job` changes the provided fields on a job identified by D.O. number
  and date. Empty strings and an empty item list are sent when explicitly
  provided, allowing fields and items to be cleared where supported.
- `get_job` retrieves a job and its complete provider record, including items,
  milestones, status, contact details and proof-of-delivery information.
- `delete_job` removes a job and confirms the provider accepted the deletion.
- `reattempt_job` retries a failed job, optionally on a different date.
- `list_jobs` supports date, type, driver, status, D.O. number, free-text query,
  sorting and pagination. `search_jobs` searches across dates with tracking,
  order, customer, driver and status criteria.

Job reads, deletes, reattempts and document downloads accept an optional job
type to distinguish Delivery and Collection jobs with matching D.O. numbers.
The update tool's type also identifies the job type in the update request.

The list and search APIs return one page at a time, with pagination links.
Their documented responses do not contain a total count; a total is returned
only if the provider supplies one. Job list and search page sizes are limited
to 100. Detrack documents a limit of 60 requests per minute.

## Documents

`download_pod` prepares a downloadable PDF for proof of delivery or a shipping
label. It retains a provider download URL requiring the connected API key. It
does not return PDF bytes in the structured result. The provider export accepts
`pod` and `shipping-label` document values; the existing `shipping_label` tool
input selects the latter.

## Vehicles and planning discovery

- `list_vehicles` lists a page of drivers and their identifiers, location,
  speed, battery, distance and connection status. Pagination links are exposed.
- `get_vehicle` looks up one exact driver or vehicle name and returns full
  details. Use `list_vehicles` to discover names.
- `manage_vehicle` creates a vehicle using its name and driver-app Detrack ID,
  or updates/deletes an existing vehicle after resolving its name to its ID.
- `list_depots` returns full depot records, including IDs, names, addresses and
  coordinates.
- `list_routes` retrieves routes by date and optionally by exact route name,
  preserving available vehicle, job, status and planning details.

Route creation/optimization, bulk job operations and webhook registration are
not exposed by these tools. No current-user or account-profile endpoint is
published in the reviewed API reference. Vehicle transport and field mappings
are documented in Detrack's official PHP v2 client; that repository is archived,
so current runtime support needs a live-account check.

## References

- [Official API v2 reference](https://detrackapiv2.docs.apiary.io/)
- [API job fields and descriptions](https://help.detrack.com/en/articles/6126913-detrack-api-job-fields-and-descriptions)
- [Official PHP client](https://github.com/detrack/detrack-core-php)
