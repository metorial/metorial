# CATS integration

The integration uses the [official CATS API v3](https://docs.catsone.com/api/v3/) with an API key in the `Authorization: Token …` header. Create a key in CATS Administration settings. The connected site is checked during authentication and is available through `get_site`.

## Capabilities

- Candidates: create, get, update, delete, list, keyword search, and structured filtering.
- Companies and contacts: create, get, update, delete, keyword search, and structured filtering. An omitted search query lists records.
- Jobs: create, get, update, delete, keyword search, structured filtering, status discovery, and status changes.
- Pipelines: create, get, list, change status or rating, and delete. Discover workflow and status IDs before applying a status.
- Activities: log calls, emails, meetings, text messages, and other activities; retrieve or list activity records. Calls map to `call_talked` and text messages to `text_message`.
- Tasks: create, retrieve, update, list, and delete; assign users and link records. Priority 1 is lowest and 5 highest.
- Tags: list site tags, retrieve all record tags, append existing tags, or explicitly replace record tags.

## Contracts and behavior

All existing tool keys and schema field types remain available. Existing numeric inputs remain numbers. `ownerId`, `companyId`, and location fields retain their historical optional schema shape; create calls validate the required provider relationships before sending a request. Find owners with `list_users` and companies with `search_companies`.

Job location inputs map into `location`; `orderId` maps to the provider's external requisition identifier. Partial updates read the current provider-required fields before sending PUT: candidate first and last names; company name and owner; contact first and last names, owner, and company; job title, company, and location. Explicit supplied values take precedence over current fields. The old `isActive` job input is retained but rejected with guidance to choose an explicit status through `list_job_statuses` and `change_job_status`, because CATS does not document a writable job `is_active` property.

`manage_tags` resolves exact existing tag titles into the API's ID objects. Unknown or ambiguous names fail before changing tags. `replace` uses POST for every resource type; an explicit empty `tagNames` array clears the tags. Omitting tag names does not clear them.

New record identifiers are read from the creation response or its `Location` header. Missing required record IDs and malformed list envelopes produce an actionable error. Dates use the provider's `date_created`, `date_modified`, and task `date_updated` fields. Optional typed projections omit null values; detail and discovery `raw` responses retain actual null values, including nullable job salary and external ID fields. Existing arbitrary address and HAL-link fields retain their schema and null values. API-key echoes and authentication values in returned URLs are redacted.

Creating a pipeline with an initial status, or creating a task with a completion flag, requires a follow-up update. A failure reports the already-created ID so it can be inspected before retrying. Explicit pipeline trigger selection reads the workflow status's complete trigger list; CATS enforces required triggers.

## Verification scope

Static package build, scoped formatting/lint, registration, and recursive schema compatibility are checked locally. Provider operations, tenant permissions, and runtime behavior require separate live verification.

## Official references

- [API conventions and authentication](https://docs.catsone.com/api/v3/#authentication)
- [Candidates](https://docs.catsone.com/api/v3/#candidates)
- [Jobs](https://docs.catsone.com/api/v3/#jobs)
- [Pipelines and workflows](https://docs.catsone.com/api/v3/#pipelines)
- [Tasks](https://docs.catsone.com/api/v3/#tasks)
- [Site identity](https://docs.catsone.com/api/v3/#site)
- [Tags](https://docs.catsone.com/api/v3/#tags)
