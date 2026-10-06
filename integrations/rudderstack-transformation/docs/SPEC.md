# RudderStack Transformations management API

## Authentication and regions

The current official API uses Bearer Service Access Token or Personal Access Token authentication at `https://api.rudderstack.com` or `https://api.eu.rudderstack.com`. Token permissions cover Transformations Create & Delete, Connect and Edit, Transformation Libraries Edit, and Destinations Connect; a PAT with Read-Write role is intended for testing/personal use. Region is a tool-scoped config value. Tokens are manually managed; no expiry/refresh grant is documented for this API. Requests have a 30-second timeout, no redirects and no automatic write retry. Errors preserve HTTP status while omitting submitted code/test data and upstream error bodies.

This surface is separate from the Basic-auth `/v0/testSource` and `/v0/testDestination` Test API and from data-plane ingestion. No suitable current-user/workspace identity endpoint is documented for this transformation surface. No identity route is invented.

## Supported contracts

All 13 original tool keys and input/output schemas remain compatible; four essential additions bring the total to 17. New optional fields support library creation publication, creation test events, destination association metadata and revision publication state. Public tool IDs remain under 60 characters. Legacy triggers were removed without replacement.

Transformation CRUD uses `/transformations`; update uses POST, not PUT. Built-in language values are `javascript` and `pythonfaas`. Library CRUD uses `/libraries`; library updates preserve immutable language and hydrate omitted code from the latest revision to satisfy the documented request body. Create/update publication is a `publish` query parameter. Destination IDs require publication; connecting to an existing destination can replace its current transformation.

Published collection envelopes are `transformations` and `libraries`. Revision envelopes are `TransformationVersions` and `libraryVersions`. Older `versions`/array response variants remain recognized when their contents validate, without treating unexpected objects as empty success. Version IDs are distinct from resource IDs. Count must be a positive whole number; orderBy is asc/desc. The provider documents no continuation cursor/offset for these routes. Get/list may return only published copies; draft updates are read through revision detail endpoints.

The existing `publish` tool retains documented POST `/libraries/publish` with `versionId` and optional transformation `testInput`. It reports request acceptance and rejects explicit validation-failure responses; callers should read selected published revisions back. The current official CLI additionally uses `/transformations/publish` with different `testSuite` and validation-output semantics. No automatic mutation fallback between those routes is attempted.

New `test_transformations` calls the current official CLI's POST `/transformations/tests/run` with requested revision IDs, named `testSuite` entries, JSON input and optional expected output. Optional library revision IDs are compiled/validated alongside them. It returns aggregate and per-revision/test-case pass/fail, observed output and generic error summaries, omitting error event bodies and provider messages that could echo test/customer data. Missing or duplicate requested revision/case results fail clearly. Aggregate and per-revision success are reduced to failure when test statuses or execution errors disagree. This does not publish or connect resources, but it executes code and imports that can access external services.

New `manage_destination_connection` uses POST `/transformations/{id}/connectToDestination` or `/disconnectFromDestination` with `destinationId`. Transformations must be published. A destination supports only one transformation at a time. The result includes association metadata when reported; state must be read back rather than inferred solely from a success-shaped response.

Code remains part of existing resource and test-result contracts, not a generated/downloaded file. DTOs validate expected fields and discard unrelated response payloads. Empty updates, empty publication/test requests, invalid branch combinations and malformed IDs fail through ServiceError. Deletion does not purge revision history.

## Primary sources

- https://www.rudderstack.com/docs/api/transformation-api/
- https://www.rudderstack.com/docs/api/test-api/
- https://github.com/rudderlabs/rudder-iac/blob/956121e1d082479e076d84010b1c6b7e06bde6f7/api/client/client.go
- https://github.com/rudderlabs/rudder-iac/blob/956121e1d082479e076d84010b1c6b7e06bde6f7/api/client/transformations/transformations.go
- https://github.com/rudderlabs/rudder-iac/blob/956121e1d082479e076d84010b1c6b7e06bde6f7/api/client/transformations/types.go

The current API page's destinationIds field table differs from older example bodies using destinations. This integration retains the documented destinationIds input/body and provides the explicit connection lifecycle tool. The legacy publication route remains grounded in current API documentation; the newer official SDK does not independently establish its live availability. First live verification must settle deployment response shapes, retained-history behavior and permissions.
