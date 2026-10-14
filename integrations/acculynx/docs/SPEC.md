# AccuLynx integration

AccuLynx manages sales, production, finance, and operations for roofing contractors.

## Authentication

All requests use an API key as a Bearer token against `https://api.acculynx.com/api/v2`. Generate a key on the [AccuLynx API page](https://my.acculynx.com/apikeys). Each company location needs its own API key. `who_am_i` returns the company ID, name, time zone information, and insurance setting for the connected location. See [Advanced API for Developers](https://apidocs.acculynx.com/docs/api-integrations-for-developers).

## Jobs and contacts

List, search, retrieve, and create jobs. Job creation links an existing contact and starts in the Lead milestone without an assigned representative. Optional classification IDs come from `get_company_settings`; legacy trade type, work type, and lead source names are resolved to those IDs. Description text is sent as job notes. Estimated value and child lead source fields are retained for compatibility but rejected with guidance because the creation endpoint does not support them. See [Create Job](https://apidocs.acculynx.com/reference/createjob).

Job listing maps `pageStartIndex` to the API's `recordStartIndex`. `filterByDate` remains supported, with `dateFilterType` taking precedence when both are supplied. Search jobs using a text query, map coordinates, or both; the search endpoint excludes unassigned jobs. See [Get Jobs](https://apidocs.acculynx.com/reference/getjobs) and [Search Jobs](https://apidocs.acculynx.com/reference/searchjobs).

List, search, retrieve, and create contacts, and log contact communications. Contact creation resolves contact type names to IDs and country/state names or abbreviations to numeric IDs; state names require a country. Numeric state/country IDs can be supplied directly. Phone numbers must contain exactly 10 digits, with Home as the default phone type. Contact logs require a communication type and date when invoked, accept Phone Call as an alias for PhoneCall, and convert date-only input to midnight UTC. The accepted submitted log details are returned because the provider responds with no content and no log ID. See [Create Contact](https://apidocs.acculynx.com/reference/postcontacts) and [Create Contact Log](https://apidocs.acculynx.com/reference/postcontactlog).

Contact search uses a zero-based page index. Its optional date range defaults from 1970 through the current time, with CreatedDate ascending sorting. See [Search Contacts](https://apidocs.acculynx.com/reference/postcontactsearch).

`get_contact_jobs` lists a contact's related job IDs and resource links, with the provider's total count and pagination metadata. `get_job_custom_fields` reads a job's custom field IDs, labels, types, values, and modification details. See [Get Jobs for a Contact](https://apidocs.acculynx.com/reference/getcontactjobs) and [Get Job Custom Fields](https://apidocs.acculynx.com/reference/getjobcustomfields).

## Other supported workflows

- Read job representatives, insurance information, milestone and change history.
- Retrieve estimates, estimate sections, invoices, financial worksheets, financial amendments, supplements, and accounting integration status.
- Read or record received payments, outgoing payments, and additional job expenses.
- List calendars, retrieve calendar appointments, and manage a job's initial appointment.
- Upload job documents, photos, and videos.
- Create job messages and replies. An optional new-message subject is prepended to its message text.
- Retrieve users, company settings, and lead history.

This integration currently registers 25 tools and no event triggers. Scheduled reports, measurements, and webhook subscription management are not exposed as tools.
