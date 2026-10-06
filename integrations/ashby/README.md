# Ashby

Read and manage candidates, applications, jobs, interview schedules and offer forms through Ashby's documented public API. Discover the organization resources those workflows require, inspect the connected API key and download candidate or offer files.

Connect an API key from Developer Settings. Enable `apiKeysRead` for connection/identity verification and the endpoint-specific permissions needed by each workflow. The API key is the Basic-auth username with an empty password. No organization ID or OAuth setup is required. The connected key's observed API version is exposed by the identity tool; the reference used here is `2026-01-01`.

| Tool | Behavior |
| --- | --- |
| Create Candidate | Creates a full name and primary personal email/phone; social links use a separate update. |
| Get Candidate | Reads an exact ID or one unambiguous email/name match, including visible field and file metadata. |
| Update Candidate | Updates profile fields and separately adds a tag, note or project membership. |
| Create Application | Associates an existing candidate and job, with optional documented pipeline/source fields. |
| Update Application | Changes stage/source, transfers between jobs, or changes hiring-team membership. |
| List Applications | Reads one page or an exact application, with documented expansions. |
| Create Job | Creates a job with a title and explicit department/team and location IDs. |
| List Jobs | Reads an exact job, one filtered page or bounded title-search results. |
| Update Job | Changes details/status or replaces compensation tiers through separate operations. |
| Manage Offer | Reads offers, starts a form in an existing process, submits a form or force-approves the latest version. |
| Manage Interview Schedule | Lists exact schedule/event IDs, creates schedules, updates existing events or cancels a schedule. |
| List Organization Data | Discovers departments, locations, users, sources, archive reasons, tags, candidates, projects, field definitions, plans/stages/interviews and hiring roles. |
| Set Custom Field | Sets or clears a supported Candidate, Application, Job or Opening field. Offer fields use offer forms. |
| Get Current API Key Identity | Returns key title, creation time, endpoint permissions and observed API version. |
| Download Candidate or Offer File | Prepares a downloadable file from its exact provider handle. |

Pagination uses `perPage` from 1–100 and opaque cursor/sync tokens. Preserve native `pageInfo` fields, including absence/null. Follow pages until the provider explicitly reports `moreDataAvailable: false`; an omitted flag is not proof of completion. Job title search is bounded by `perPage`, does not accept sync/cursor tokens and applies a combined status filter locally. Source, archive-reason, hiring-role and plan-bound interview-stage discovery are not paginated. User search uses an exact email.

Compound writes are sequential and are not atomic. A failure after an accepted operation identifies confirmed prior operations; a response/readback failure can leave completion unknown. Read the exact resource before retrying. Warning codes can indicate partially accepted metadata. Recruiting, notification, calendar, compensation and approval history may remain after a later state change.

Application transfers require an explicit target stage and plan; the exact target job's default plan is used only when available. Hiring-role names must resolve uniquely, or pass the discovered role ID. Schedule updates require the existing event ID from the exact selected schedule and are limited by Ashby to schedules created with the same key. Feedback deletion is denied during event updates.

Offer process, form-instance, offer-record and offer-version IDs are distinct. `start` requires an existing prepared process and returns a form instance; `create` requires that process and form ID. Neither form submission nor starting a version implies offer delivery or acceptance. `approve` force-approves the current version and overrides the approval process. Native offers do not provide top-level creation/update timestamps; version timestamps are exposed instead.

Legacy tool keys and field types are retained. Unsupported legacy nonpersonal contact types, Offer custom-field writes and old offer/application-ID routing combinations fail with actionable guidance. Job creation still accepts the legacy optional-ID schema but requires its documented department/team and location fields before writing. No candidate deletion, file upload, reports, feedback, job posting, headcount or webhook operations are included. Ashby-generated demo files may not be downloadable; file access URLs are renewed on each download because the API does not document their lifetime.

[Authentication](https://developers.ashbyhq.com/docs/authentication) · [API versions](https://developers.ashbyhq.com/docs/api-versions) · [API reference](https://developers.ashbyhq.com/reference/introduction)

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
