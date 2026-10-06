# HoneyHive integration

Manage trace sessions and events, evaluation datasets and datapoints, prompt configurations, metrics, and experiment runs in the project authorized by the connection API key.

## Authentication and migration

Use a project-scoped HoneyHive data-plane API key as a Bearer token. The managed-cloud default is `https://api.dp1.us.honeyhive.ai`. Dedicated and self-hosted deployments can specify their data-plane URL. Stored connections using the former managed-cloud URL `https://api.honeyhive.ai` automatically use the new default host, but their classic API keys must be replaced with current project-scoped keys.

The optional legacy `project` configuration and tool fields remain accepted for compatibility. They do not select or override a project: the API key determines the project. Use separate connections and project-scoped keys for separate projects. Control-plane and ingestion-only credentials do not grant these resource-management operations.

Project administration requires separate control-plane credentials. The existing `list_projects`, `create_project`, `update_project`, and `delete_project` keys are retained and marked deprecated; they return an explicit provider limitation without sending an API request. Manage projects in HoneyHive administration. This connection does not add organization or workspace provisioning.

The data-plane API has no documented current-user/profile endpoint. No identity tool or OAuth refresh flow is invented.

## Capabilities

| Resource | Supported operations |
| --- | --- |
| Sessions | Start a session and retrieve the session event by correlation ID |
| Events | Log one event or a batch, query by structured filters and date range, retrieve an event by row ID, update trace fields, post feedback |
| Datasets | List by dataset ID, create, update name/description/datapoint membership, delete, import mapped records |
| Datapoints | List by IDs or dataset name, create, retrieve, update, delete |
| Prompt configurations | List by name/environment, create, update, delete |
| Metrics | List, create, update, delete; legacy custom/model/human values map to PYTHON/LLM/HUMAN |
| Experiment runs | List by IDs/dataset/name/status with sorting and pagination; create, retrieve, update, delete; retrieve results and compare runs |

Session correlation IDs differ from event row IDs. `start_session` and `get_session` return `sessionId` for associating child events and `eventId` for updating or enriching the session event. Session reads query for a session-typed event with the requested correlation ID; they never treat the correlation ID as an event row ID.

`delete_event` and `delete_session` retain their keys and schemas and are marked deprecated. They return an explicit provider limitation because the data-plane API has no individual trace deletion endpoint. There are no triggers.

## Compatibility details

Requests follow the [current data-plane OpenAPI specification](https://github.com/honeyhiveai/honeyhive-openapi/blob/main/data_plane_openapi.json), version 1.9.0, and the [current TypeScript migration guide](https://docs.honeyhive.ai/v2/sdk-reference/typescript-logger-to-api-sdk-migration). Session and event creation use bare bodies at `/v1/sessions` and `/v1/events`; batch creation translates `isSingleSession` to `single_session`. Event updates put the row ID in the URL. Resource updates and deletes use documented `/v1/` paths.

The documented `/v1/events/export`, `/v1/runs/{run_id}/result`, and `/v1/runs/{new_run_id}/compare-with/{old_run_id}` compatibility routes preserve the existing query/result/comparison tool contracts. Trace queries return structured event data, not a generated file. Event filters require scalar values and documented operators; legacy `id` type maps to `string`. Date ranges require both `from` and `to`. Query counts map from the provider's `count` field.

Run filters and pagination use the provider API. Page sizes above the provider's 100-result maximum are assembled from provider pages to preserve existing tool input limits. Legacy `run_id` sorting loads and sorts the complete filtered collection, so it can require several requests. Other sorting is performed by the provider. Optional legacy result/comparison `projectId` fields do not override API-key scope.

Current provider contracts no longer support session-creation `error`, dataset metadata, dataset type filters, fine-tuning/session-pipeline dataset settings, or run-update `datasetId`. These existing schema fields remain present and return explicit validation errors when unsupported values are supplied. The legacy dataset creation defaults `evaluation` and `event` are accepted for compatibility without sending obsolete fields. Set a run dataset during creation and log errors on child events.

For custom metrics, `codeSnippet` maps to evaluator `criteria`; for model metrics, `prompt` maps to `criteria`. Human metrics use `criteria` directly. `passWhen` belongs inside `threshold`, and event selectors map to provider filters. Partial threshold/filter updates preserve unrelated existing settings. Creation outputs include the prompt/metric ID so subsequent calls and cleanup can use the created resource directly.

## Live verification boundaries

The live suite creates and deletes only resources with documented deletion APIs and confirms changes by reading them back. It registers recovery cleanup before mutation-readback assertions and also deletes datapoints created by dataset imports. It does not assume dataset deletion cascades datapoints or project deletion cascades traces.

Trace creation/enrichment scenarios are gated because current project-scoped credentials cannot provision a disposable isolated project or delete individual traces. Optional existing session/event IDs support read-only scenarios. The suite remains active when local credentials are unavailable; missing credentials are reported as setup failures.

## Official references

- [Current TypeScript SDK](https://docs.honeyhive.ai/v2/sdk-reference/typescript)
- [Logger-to-current-SDK migration](https://docs.honeyhive.ai/v2/sdk-reference/typescript-logger-to-api-sdk-migration)
- [Data-plane OpenAPI](https://github.com/honeyhiveai/honeyhive-openapi/blob/main/data_plane_openapi.json)
- [API key types](https://docs.honeyhive.ai/v2/workspace/api-keys)
- [Platform architecture](https://docs.honeyhive.ai/v2/platform-architecture)
