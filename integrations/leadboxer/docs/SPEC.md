# LeadBoxer integration

LeadBoxer identifies website visitors and enriches company and contact records with behavioral and firmographic data.

## Authentication and datasets

The App and Lookup APIs use `x-api-key` authentication at `https://api.leadboxer.com`. Lead details and dataset discovery additionally require the email address of the account that owns the key. Save this as `accountEmail` with the connection or supply it to the relevant tool; it is distinct from a lead’s email address.

Connection setup does not require an opaque dataset ID. Use `list_datasets` to discover accessible IDs and pass `datasetId` to scoped tools. Existing saved dataset configuration remains a fallback. Lookup operations can omit the dataset to use an account-linked default.

## Tools

| Key | Purpose | Provider operation |
| --- | --- | --- |
| `get_leads` | Filter and paginate identified leads | `GET /v1/leads` |
| `get_lead_details` | Retrieve a lead and optionally a page of its sessions | `GET /v1/leads/{leadId}` and `GET /v1/leads/sessions` |
| `ip_lookup` | Identify the company and location associated with an IP | `GET /v1/ip-lookup` |
| `domain_lookup` | Enrich a clean domain with company data | `GET /v1/domain-lookup` |
| `track_event` | Submit behavioral events and profile properties | `GET https://log.leadboxer.com/` |
| `manage_lead_tags` | Add, remove, or replace a lead’s tags | Retained legacy compatibility route: `GET https://kibana.leadboxer.com/api/management/update_lead_tags`; runtime support is unverified |
| `list_datasets` | Discover accessible datasets and their names | `GET /v1/users/datasets` |
| `get_lead_events` | Retrieve events for a session | `GET /v1/leads/events` |
| `email_lookup` | Enrich a work email with professional profile data | `POST /v1/email-lookup` |

## Read workflows

`get_leads` defaults to 50 records from the last 30 days. The existing `period` input translates to the provider’s time-filter grammar; day, week, month, and year suffixes use fixed day counts (a month is 30 days and a year is 365 days). `criteriaTimeFilter` overrides `period` for exact date ranges or other provider time filters. The existing `email` input filters lead email addresses using the provider’s text-filter grammar.

Lead list responses contain a `data` array and `metaData`. The tool returns normalized leads, their returned count, and available `nextToken` and `totalCount` values. Pass `nextToken` back within 10 minutes to continue.

Pass a returned lead ID (`use_id`) to `get_lead_details`. Set `includeSessions` to retrieve sessions; its default session limit is 100 (maximum 10000). Pass `sessionsNextToken` back as `sessionsPageToken` within 10 minutes to continue. Requested session failures are surfaced rather than presented as an empty history.

Use a session ID with `get_lead_events` to retrieve up to 100 event records, preserving provider identifiers, timestamps, custom properties, and query metadata. The API does not document event-page continuation parameters.

## Enrichment and tracking

Domain lookup maps the provider’s nested `organizationAddress` and `organizationSocialLinks` into the existing address and social output fields. Provider specialty arrays become a comma-separated string to preserve the established output type. Existing optional fields for technologies, revenue, and other legacy attributes remain available when returned; the current domain response does not guarantee them.

Email enrichment sends email and optional name/company hints in a JSON POST body. A successful match costs 50 credits; unmatched requests are not charged. Other enrichment calls also consume provider credits.

Event tracking uses dataset `si`, title `ti`, and the documented `json` return format. User, session, and event identifiers may be supplied through `leadboxerUserId`, `sessionId`, and `eventId`. Custom property names must be ASCII and cannot override dedicated routing or response-format parameters. The existing `rawResponse` is returned unchanged, and plain event-ID responses are also exposed as `eventId`.

The existing tag tool retains its legacy route and action inputs for compatibility. An older indexed official guide documents the legacy add/remove parameters and action omission as overwrite; its current runtime support has not been verified. The current official guide documents authenticated `PUT /v1/management/lead-tags` as replacement of the complete tag list. It explains adding or removing a tag by reading the current tags and submitting a revised list. That workflow has not been substituted for the existing tool in this refresh.

## Official documentation

- [Authentication](https://developers.leadboxer.com/reference/authentication)
- [Lead retrieval](https://developers.leadboxer.com/reference/users)
- [Lead details](https://developers.leadboxer.com/reference/leaddetail)
- [Lead sessions](https://developers.leadboxer.com/reference/getsessions)
- [Session events](https://developers.leadboxer.com/reference/getevents)
- [Datasets](https://developers.leadboxer.com/reference/getuserdatasets)
- [IP lookup](https://developers.leadboxer.com/reference/lookupip)
- [Domain lookup](https://developers.leadboxer.com/reference/lookupdomain)
- [Email lookup](https://developers.leadboxer.com/reference/lookupemail)
- [Server-side tracking](https://developers.leadboxer.com/docs/server-side-events)
- [Lead tags](https://help.leadboxer.com/leadboxer/fundamentals/elements/lead-tags)
