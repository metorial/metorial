# Stack AI integration specification

## Authentication and workflow identity

Use a bearer API key generated in Settings > API Keys. Copy a published workflow API URL from Export View > API to resolve the organization and flow IDs. The documented deployed origin is `https://stack-inference.com`; exported URLs using `https://api.stack-ai.com` are also accepted. API URL parsing restricts credentials to these provider origins and the workflow execution path.

The optional deployment URL during connection supplies the default organization and workflow. The `run_flow` tool can instead take the exported URL or explicit flow/organization IDs. Existing stored organization configuration remains supported. Authenticated requests do not follow redirects, and invalid or dot-segment path identifiers fail before sending. An organization ID is required only by organization-scoped paths. No public identity discovery or OAuth refresh contract was found; the integration does not invent either.

## Confirmed public operations

| Tool | Provider operation | Behavior |
| --- | --- | --- |
| `run_flow` | `POST /inference/v0/run/{org_id}/{flow_id}` | Workflow-specific JSON inputs; optional integer version and verbosity. Retains the existing object output contract; the current official response schema is unconstrained. |
| `upload_document` | `POST /upload_to_supabase_user` | Multipart file and org/user_id/flow_id/node_id query fields. Requires a deployed workflow Files Node; returns upload acceptance metadata. |
| `list_knowledge_base_resources` | `GET /v1/knowledge-bases/{knowledge_base_id}/resources` | Opaque cursor; page size 1–100; direction next/prev. The current official response schema is unconstrained, so the established data/cursor/has_more mapping still needs live confirmation. |
| `upload_knowledge_base_resource` | `POST /v1/knowledge-bases/{knowledge_base_id}/resources` | Multipart file; HTTP 202 starts indexing and returns message/resource_id. Acceptance does not mean indexing has finished. |
| `get_project_analytics` | `GET /analytics/org/{org_id}/flows/{flow_id}` | Array of run logs; zero-based page, positive page size, ISO datetime range, optional user ID and execution state filters. |
| `get_organization_analytics` | `GET /organizations/analytics/projects-run-summary` | Array of project summaries, including project IDs/names for workflow discovery; pagination and ISO datetime range. |

Upload content may be UTF-8 text or base64 file bytes. Base64 must be valid and omit a data URL prefix. Uploaded file names cannot include directory paths. No download operation is implemented.

## Preserved management contracts

The established tool keys and routes are retained for feedback; workflow document listing/deletion; knowledge-base CRUD, synchronization and resource deletion; connection listing/details/health/browse/deletion; storage usage; conversation listing/rename/archive/deletion; manager conversation listing; folders; tool-provider listing and generic action execution. Their absence from today's public reference does not establish removal. No authoritative public SDK or source was found that verifies their current request/response contracts or management credential scopes.

These tools retain the prior payloads and output fields. Unexpected payload shapes fail clearly. Cursor metadata is exposed only where the established contract provides it; no undocumented cursor request parameters are added. Generic external actions and workflow execution are marked destructive because their configured behavior can change or delete external data or send messages. Obtain action IDs and input schemas from the Stack AI action configuration.

## Official sources

- [API reference](https://docs.stackai.com/interface-and-deployment/api-reference)
- [Run Flow](https://docs.stackai.com/interface-and-deployment/api-reference/run-flow)
- [API deployment and workflow file upload](https://docs.stackai.com/interface-and-deployment/end-user-interfaces/api)
- [Knowledge-base files](https://docs.stackai.com/interface-and-deployment/api-reference/knowledge-bases)
- [Analytics](https://docs.stackai.com/interface-and-deployment/api-reference/analytics)
- [Company GitHub organization](https://github.com/stackai)
