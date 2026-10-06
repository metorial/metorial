# RudderStack integration

## API and authentication

| Surface | Route | Credential |
| --- | --- | --- |
| Transformations and libraries | `/transformations`, `/libraries`, revisions and bulk publish | Workspace Service Access Token, Bearer |
| Tracking plans and events | `/v2/catalog/tracking-plans` | Workspace Service Access Token, Bearer |
| Reverse ETL syncs | `/v2/retl-connections/{connectionId}` | Workspace Service Access Token, Bearer |
| Test stages | `/v0/testDestination/{id}`, `/v0/testSource/{id}` | Basic: empty username, workspace Service Access Token password |
| Audit logs | `/v2/audit-logs` | Organization Admin Service Access Token, Bearer; Enterprise |
| User suppression | `/v2/regulations` | Bearer; retained provider reference, account feature required |
| Event Audit | `/v1/event-audit/event-models` | Retained legacy Basic transport; current detailed reference unavailable |
| Event ingestion | Approved Data Plane URL, `/v1/{eventType}` and `/v1/batch` | Basic: Source Write Key username, empty password |

Control-plane hosts are `https://api.rudderstack.com` and `https://api.eu.rudderstack.com`. Credentials are never redirected. Token permissions and feature access are checked by RudderStack; an organization token is used only for audit logs.

## Contracts

All 15 established tool keys and schemas remain; List Tracking Plan Events and Cancel Regulation complete readback and cancellation workflows. Inputs serialize as object schemas. No trigger implementation is registered.

Code publishing is a query parameter on create/update. Bulk publish resolves each resource's latest revision ID and sends `versionId` with optional transformation `testInput`. Python uses the provider's `pythonfaas` value. Library name and language remain immutable. Published-resource deletion does not erase revision history.

Catalog upserts run individually: POST creates an event with properties, PUT associates catalog IDs, and PATCH supports the retained rules form. A later failure does not undo earlier accepted events. Association removal keeps the catalog event. Readback must wait for queued processing.

Audit/regulation windows return `nextCursor`, `nextOffset`, and `hasMore`. Use the returned cursor as `afterCursor` and returned offset as `offset`, retaining filters. Audit end dates are applied locally. Reverse ETL uses page/per-page requests with offset continuation. Cancellation acknowledgement is not terminal confirmation.

Test stages use the provider's boolean stage object. Default destination transformation skips user code and delivery; user transformation can make external requests; router enables user code, destination transformation and delivery. Source tests fan out to every connected destination. Transport preview credentials and raw downstream responses are concealed; user transformation results, destination identifiers and stage status remain available.

Ingestion supports six event types, identity validation, 32 KiB per event and 4 MiB per batch. Acknowledgement is distinct from collector readback. Suppression can affect all resources when IDs are omitted. Destination deletion and suppression cancellation never imply restored deleted data.

## Official references

- [Transformations API](https://www.rudderstack.com/docs/api/transformation-api/)
- [Tracking plan Catalog API](https://www.rudderstack.com/docs/api/data-catalog-api/tracking-plans/)
- [HTTP API](https://www.rudderstack.com/docs/api/http-api/)
- [Test API](https://www.rudderstack.com/docs/api/test-api/)
- [Reverse ETL Connections API](https://www.rudderstack.com/docs/api/retl-connections-api/)
- [Audit Logs API](https://www.rudderstack.com/docs/api/audit-logs-api/)
- [User Suppression API](https://www.rudderstack.com/docs/api/user-suppression-api/) and [Event Audit API](https://www.rudderstack.com/docs/api/event-audit-api/): current pages lack detailed endpoint/authentication bodies; retained routes require live confirmation.
