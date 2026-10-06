# LogDNA API specification

## API and authentication

This integration targets the public Log Analysis API, also documented under Mezmo. Management calls use `https://api.logdna.com` with existing service keys, or `https://api.mezmo.com` with IAM access tokens. The optional host selection preserves existing account routing. Only these documented HTTPS hosts are accepted; redirects are disabled.

Service keys use the `servicekey` header. IAM management access tokens use `Authorization: Token <token>`. Ingestion uses a separately configured `apikey` at the corresponding `logs.logdna.com` or `logs.mezmo.com` host. Enterprise administration and IBM-specific IAM connections are outside this integration's credential contract.

## Registered capabilities

| Workflow | Tools | Public endpoint family |
| --- | --- | --- |
| Logs | Ingest; downloadable paginated export; deprecated inline export | `/logs/ingest`, `/v2/export` |
| Saved views | List, get, create, update, delete | `/v1/config/view` |
| Preset alert templates | List, get, create, update, delete | `/v1/config/presetalert` |
| Boards | List, get, create, delete | `/v1/config/board` |
| Categories | List, get, create, update, delete | `/v1/config/categories/{type}` |
| Exclusion rules | List, get, create, update, delete | `/v1/config/ingestion/exclusions` |
| Archive configuration | Get, save, delete | `/v1/config/archiving` |
| Ingestion controls | Status, suspend with confirmation, resume | `/v1/config/ingestion/status`, `/suspend`, `/suspend/confirm`, `/resume` |
| Usage | Account and app/host/tag byte breakdowns | `/v2/usage` |

## Behavior

- A v2 export page returns a JSON envelope with lines and an optional pagination ID. `download_log_export` converts exactly that page to JSONL. Continue with the identical filters, range, size, and ordering. Limits are 1–10,000 lines per page; range values accept Unix seconds or milliseconds, with zero retaining the provider's special meaning. Tag filtering belongs in the query.
- Ingestion acceptance precedes indexing. HTTP 207 is partial success and surfaces an error because some lines may already be stored. The tool never automatically resends batches. Public logger SDK options support `env`; the undocumented legacy `file` option requires `meta.file` instead.
- View preset identifiers use `presetid` in requests and `presetids` in responses. Presets are reusable notification templates attached to views. Credential-bearing channel configuration is omitted from read outputs.
- Boards use the singular endpoint and normalize `boardid`. Empty-board creation supports title, account, and category. The legacy widgets input remains present with a clear remediation error.
- Exclusion creation defaults inactive. `indexOnly` represents the provider's `indexonly` setting without inferring undocumented archive semantics. Reads support the documented singleton-array response and official Terraform client's object response.
- Archive save reads current configuration before choosing POST or PUT. Only an actual 404 means absence; permission, rate, transport, and malformed responses propagate. Readback must match the requested provider and destination, including an explicit endpoint. Secret archive fields are omitted from output and request credentials are redacted from upstream errors.
- Usage input retains Unix seconds for compatibility and converts them to the v2 ISO date contract. Reports contain bytes rather than v1 percentages of account lines. `appName` is compatible only with an app breakdown.
- Ingestion controls read back actual state. Confirmation requires the returned suspend token. Changes affect the entire account.
- Invalid input, malformed responses, and upstream failures produce structured service errors; HTTP status remains available, including rate-limit failures. No documented rate-header contract or automatic replay is assumed.
- The deprecated inline export handler retains its original service-key authentication at `api.logdna.com`. Use the downloadable export for IAM credentials or another configured account host.

## Boundaries and sources

No ordinary current-user/account identity endpoint was found for these credentials; connection verification uses the documented read-only view list. Additional enterprise account/user/group administration, screens, graph mutation, and index-rate alert settings are intentionally outside the supported workflow. No trigger is registered.

Primary sources:

- [Log Analysis API 2.1](https://docs.mezmo.com/log-analysis-api)
- [Official Terraform provider](https://github.com/logdna/terraform-provider-logdna), including response types and configuration resources
- [Official Node logger](https://github.com/logdna/logger-node), including ingestion credentials, environment metadata, and partial success
- [Official browser logger](https://github.com/logdna/logdna-browser), confirming the Mezmo ingestion host
- [Excluding log lines](https://docs.mezmo.com/docs/excluding-log-lines)
- [Official service status](https://status.mezmo.com/)

The API reference was available through the official site's indexed content during this refresh, while its live landing path returned 404 after a documentation migration. The official status page still lists Log Analysis as operational. That documentation access limitation does not establish API retirement; live credentials are required to confirm deployed account behavior.
