# Greenhouse

Manage candidate records and applications through Harvest v3. Read jobs, offers, users, departments, offices and interviews; discover rejection reasons and download application files.

Authentication requires Harvest v3 OAuth. Greenhouse made Harvest v1/v2 and API keys unavailable after August 31, 2026. Existing API-key connections must reconnect; their keys are never sent as v3 bearer tokens.

For a custom integration, create Harvest v3 OAuth credentials in Greenhouse API Credentials and supply the client ID and secret. An optional acting user ID selects a Site Admin; omission uses the credential’s integration service user. Remove the retired `onBehalfOf` setting. For partner OAuth, Greenhouse must approve the application, scopes and redirect URI. Custom access tokens are regenerated; partner access tokens are refreshed using the issued refresh token. `get_current_context` verifies organization, subject and granted scopes with the issuing client. It does not infer a current person from the first user in a list.

All list endpoints require Site Admin or integration service user access. Private candidates, notes, offers and fields require additional Greenhouse permissions. An empty page does not establish that the organization has no such records.

The 19 existing tool keys are retained. Four additions provide current connection verification, rejection reason discovery, application file discovery and file downloads. Lists return `hasMore` and `nextCursor` from Greenhouse pagination links. Use `cursor` alone on subsequent pages. Application file lists also retain their application ID to verify ownership. Legacy `page` supports only the first page. Date filters support one created or updated range per request.

Harvest v3 compatibility limits:

- Find candidates associated with a job through `list_applications(jobId)` and the returned candidate IDs. The retired `list_candidates.jobId` filter fails with this remediation.
- Creating a candidate supports at most one application job ID. Social profiles use optional `socialMediaUrls`; typed legacy `socialMediaAddresses` require migration. No extra application writes occur behind a candidate creation.
- Job creation requires `numberOfOpenings` and a template whose required custom fields are already supplied. Job deletion is not available through Harvest. Created jobs and audit history remain.
- Rejection requires `rejectionReasonId`; discover it with `list_rejection_reasons`. Email scheduling requires a template and timestamp. Rejection confirmation does not prove email delivery.
- Automatic advance uses the documented v3 move operation with its target omitted. Explicit moves use job interview stage IDs from `get_job(includeStages)`. Transition rules may send automated emails and retain stage history.
- Candidate tags resolve unique existing organization tag names. Removing a tag deletes only that candidate’s membership; it does not delete the tag definition.
- Expanded v1 relationships that v3 no longer returns remain omitted. Available relationship IDs are returned instead; omitted values are not replaced with invented empty collections or names.
- Offer `sentAt` and `startsAt` preserve provider calendar dates. V3 has no `sent` status; inspect `sentAt` instead.
- Candidate notes preserve author and visibility. Their records can be removed only as part of permanent candidate deletion; audit effects can remain. No note deletion tool is provided.

Downloads verify the file’s application ID and provide a downloadable file with metadata. Greenhouse URLs last seven days and can be renewed. API bearer credentials are not forwarded to the file host.

Requests are not automatically retried. After an ambiguous write failure, inspect the candidate, application or job in Greenhouse before submitting the change again.

Official documentation: [Authentication](https://harvestdocs.greenhouse.io/docs/authentication), [Partner OAuth](https://harvestdocs.greenhouse.io/docs/harvest-partner-oauth), [Pagination](https://harvestdocs.greenhouse.io/docs/pagination), [Write migration](https://harvestdocs.greenhouse.io/docs/write-endpoint-migration-guide), [V1/v2 retirement](https://support.greenhouse.io/hc/en-us/articles/5888163769883-Create-Harvest-API-credentials-for-an-integration).
