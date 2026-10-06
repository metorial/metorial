# Stitch integration API scope

This integration targets Stitch Data, the Qlik/Talend data pipeline product. The current developer documentation supports Connect and Import APIs. The deprecated Connect.js browser library is outside this integration's scope.

## Credentials and region

Connect account tokens and Import source tokens both use Bearer authentication but have different scopes. The `api_token` method retains its required `token` field. Supply a Connect token for management, an Import token for import-only use, or both using optional `importToken`. Choose `us` or `eu` on the connection.

Connect setup validates access by listing sources. It discovers `clientId` only when the returned source metadata identifies one account; empty accounts retain the configured fallback. Import credentials have no documented read-only identity endpoint. Public Import health does not validate a credential.

New connections retain region in authentication state. Existing stored configuration regions remain readable without presenting a second region setting. US and EU use `api.stitchdata.com` and `api.eu-central-1.stitchdata.com`, respectively.

## Supported operations

The 23 established tool keys remain, with `get_import_status` added. Sources, destinations and streams use Connect v4; notifications use the documented public v1 paths; ingestion and validation use Import v2.

Source scheduling values are submitted inside connection properties. Choosing an interval clears an existing cron expression so the interval can take effect. Scheduling support and permitted frequencies depend on the source and plan. Stream listing returns object metadata; detailed schemas can contain breadcrumb metadata and an encoded JSON schema.

Destination creation accepts optional `ignoreUnmappedSources`. Hook creation accepts optional `destinationId`; omission is allowed only when exactly one destination exists. The legacy destination-update `name` field remains accepted by the schema but returns an explicit explanation that renaming is unavailable through the documented endpoint.

Extraction/load pages contain up to 100 records. `nextPage` provides continuation; job-resource requests share the documented 30-per-10-minute limit. Log requests produce a downloadable file and can renew an expired download without exposing credentials in ordinary results.

Source and destination properties expose a conservative non-secret subset. Notification callbacks expose URL origins. Configuration form descriptors remain available, including credential-required flags, without credential values.

Connection-check states `running`, `succeeded` and `failed` are diagnostic outcomes rather than operation errors. Diagnostic URL user-info, query strings and fragments are removed even when embedded in a longer error description. Stream updates require a numeric status-200 acknowledgment; source deletion requires its matching deletion tombstone, destination deletion an empty response, email deletion `[1]` and hook deletion `null`. Notification enable/disable acknowledgments must reflect the requested state.

## Boundaries

Partner account provisioning, session creation, source token minting and application OAuth handshakes are not offered. Use the provider dashboard or partner-specific APIs for those workflows. There is no invented account identity endpoint or provider-wide retirement.

Import batches are accepted asynchronously. Validation does not persist records. Extraction cancellation and source deletion do not erase data already loaded into a warehouse.

## Official references

- [Current developer portal](https://help.qlik.com/en-US/stitch/developers)
- [Connect reference](https://www.stitchdata.com/docs/developers/stitch-connect/api)
- [Import reference](https://help.qlik.com/en-US/stitch/developers/import-api/api)
- [Scheduling guide](https://www.stitchdata.com/docs/developers/stitch-connect/guides/replication-scheduling-for-sources)
- [Import source setup](https://www.stitchdata.com/docs/developers/stitch-connect/guides/create-import-api-integration-with-stitch-connect)
- [Extraction logs](https://www.stitchdata.com/docs/replication/extractions/integration-extraction-logs)
