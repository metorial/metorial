# Seqera Integration

Manage saved Nextflow pipelines and workflow runs through the Seqera Platform API.

## Connection

Use a personal access token with Bearer authentication. The default API URL is
`https://api.cloud.seqera.io`; Enterprise deployments can supply their API URL in
the access-token authentication settings. Existing connections retain their
stored API URL as a compatibility fallback.

Call `get_current_user` to identify the authenticated user. Call
`list_organizations`, then `list_workspaces` to discover authorized workspace
IDs. Workspace-scoped tools accept an optional `workspaceId` override; omission
uses the connection default or personal context where the provider supports it.

## Tools

- Pipelines: list, inspect launch configuration, create, update, and delete.
- Runs: launch, list, inspect progress and metrics, read the current log page,
  list task pages, and cancel.
- Compute environments: list, inspect, set primary, and delete.
- Datasets: list, create, update, delete, and upload CSV or TSV versions.
- Credentials: list stored credential metadata.
- Pipeline secrets and labels: list, create, update, and delete. Secret names
  cannot be changed; create a replacement secret to use a different name.
- Organizations and workspaces: discover authorized resources.
- Existing pipeline actions: list, inspect, trigger, pause/resume, and delete.
- Participants: list users and teams for an organization workspace.

Pipeline updates preserve labels when `labelIds` is omitted. An empty array
removes all labels. Workflow listing supports provider search and pagination;
its legacy sorting inputs report an actionable error because the current API
has no corresponding sort parameters. `get_workflow` includes at most the first
100 tasks; use `list_workflow_tasks` for additional pages.

## API references

- [Platform API and authentication](https://docs.seqera.io/platform-api/)
- [Current OpenAPI schema](https://cloud.seqera.io/openapi/seqera-api-latest.yml)
- [Pipelines](https://docs.seqera.io/platform-api/info/pipelines-info)
- [Datasets](https://docs.seqera.io/platform-api/info/datasets-info)
- [Users](https://docs.seqera.io/platform-api/info/users-info)
