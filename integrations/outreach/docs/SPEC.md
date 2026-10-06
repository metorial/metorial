# Outreach API coverage

This package uses the current OAuth JSON:API REST API at `https://api.outreach.io/api/v2`. It retains 17 established tool keys and adds `list_sequence_states` and `list_metadata`, for 19 tools.

| Capability | Tools | Provider contract |
| --- | --- | --- |
| Prospects | manage_prospect, get_prospect, list_prospects | prospects; singular prospect type; email/phone arrays; nested account/owner filters |
| Accounts | manage_account, list_accounts | accounts; singular account type; websiteUrl and owner=user |
| Sequences | manage_sequence, list_sequences | sequences; activation/deactivation actions, rather than writing read-only enabled |
| Enrollments | manage_sequence_state, list_sequence_states | sequenceStates; creation starts automation; POST pause/resume/finish actions; no PATCH |
| Email tracking | list_mailings | mailings, including drafts/queued/scheduled records and available engagement statistics |
| Tasks | manage_task, list_tasks | tasks; completed boolean for writes; action filter for legacy taskType input |
| Opportunities | manage_opportunity, list_opportunities | opportunities; Opportunities SKU; stage relationship type opportunityStage |
| Email content | manage_template, manage_snippet | templates/snippets; bodyHtml writes, derived bodyText; private/shared snippets |
| External call history | create_call | calls; outcome Answered or Not Answered; user/prospect/disposition/purpose relationships; logging does not dial |
| User discovery | list_users | users listing; no documented current-user REST endpoint/filter |
| Metadata | list_metadata | mailboxes, callDispositions, callPurposes, stages, opportunityStages and authenticated types definitions |

Use JSON:API media types, singular resource types and numeric IDs in request bodies. Resources expose string IDs to tools, omit null optional values and retain relationship IDs. Lists use provider continuations, cursor pagination by default, and legacy offset pagination only when requested. Limit 1–1000; legacy offset 0–10000. Only trustworthy same-origin continuation cursors/offsets are returned. Provider counts are used only when exact and available.

Date-time writes require real calendar dates and valid clock components. Zone-free timestamps and explicit ISO offsets remain accepted; compact offsets are preserved. Opportunity amount is a safe integer without an invented local nonnegative restriction; provider business validation still applies.

OAuth token exchange/refresh is form encoded; persist the rotating refresh token and actual expires_in. Scope grants are not additive, and organization governance can deny operations despite granted scopes. The optional connection profile hook was removed because current public REST docs do not specify an authenticated-user response. Neither the organization users collection nor the separate MCP current-user tool establishes a REST self endpoint.

Existing schema types, field names and enum choices are retained. Unsupported/read-only legacy inputs produce explicit validation instead of silently ignoring caller choices or inventing mappings. No bulk import, custom-object, user administration, standalone send, dial, audit, Kaia, server-to-server or webhook capability is claimed.

Sources: [OAuth](https://developers.outreach.io/api/oauth), [getting started](https://developers.outreach.io/api/getting-started), [requests and pagination](https://developers.outreach.io/api/making-requests), [resource reference](https://developers.outreach.io/api/reference), [common patterns](https://developers.outreach.io/api/common-patterns), [deprecations](https://developers.outreach.io/api/deprecated-features).
