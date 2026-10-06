# v0 Integration Specification

v0 provides application generation, source imports, conversation history, and source downloads. API v2 is the current API and uses chats as workspaces. API v1 remains separately documented but its projects and deployment inspection endpoints are deprecated. The two APIs use incompatible chat resources.

## Authentication

Use an API key from [v0 settings](https://v0.app/settings) with Bearer authentication. The integration identifies the authenticated user through the documented `GET /v1/user` endpoint. No project or chat identifier belongs in connection configuration. Discover resources through the appropriate API version's list tools.

Generation consumes credits and requires account API access. Source imports create a private chat by default without requesting AI generation. v2 generation uses async mode by default, disables connected MCP servers, and disables shared npm, GitHub, and Vercel credentials when creating a new generated chat. Generation within an existing chat retains that chat's credential access configuration.

## Current API v2

| Workflow | Tools | Provider endpoints |
| --- | --- | --- |
| Generate and import | `create_current_chat`, `import_current_chat` | `POST /v2/chats`, `/v2/chats/async`, `/v2/chats/from-files` |
| Discover and manage | `list_current_chats`, `get_current_chat`, `update_current_chat`, `delete_current_chat` | `GET /v2/chats`, `GET/PATCH/DELETE /v2/chats/{chatId}` |
| Continue and inspect | `send_current_message`, `list_current_messages`, `get_current_message` | `POST /v2/chats/{chatId}/messages[/async]`, `GET /v2/chats/{chatId}/messages[/{messageId}]` |
| Download source | `download_current_files` | `GET /v2/chats/{chatId}/files/download` |

Chat discovery uses cursor pagination and supports metadata, author, and Vercel project filters. Message results expose prose, completion status, and usage. Source files are delivered as downloadable archives rather than returned as message data. The archive download requires the same API key.

## Existing API v1 contracts

All 26 existing tool keys remain available, with their existing input fields and output fields. The six chat tools direct new workflows to their current counterparts; they still operate on v1 resources. Project/environment-variable CRUD, project assignment, hooks, deployment CRUD/logs, and account/billing/plan tools retain their established behavior. Decrypted environment values are available only when explicitly requested by the existing listing input; test suites use benign owned values.

Initialization accepts one source: inline files, repository, registry, ZIP URL, or template. An omitted type is inferred from that source, including the existing templateId option. A supplied type must match the source. Repository branches require a repository source; bulk file locking applies to repository/registry/ZIP imports, while inline files use their individual locked flags.

`list_chat_versions`, `get_chat_version`, and `download_chat_version` add version discovery, source filename inspection, and ZIP/tarball downloads for backups and migration. Deployment log `since` retains its string input and accepts an ISO timestamp or numeric Unix seconds; ISO timestamps are converted to seconds for the provider.

v0 Projects are deprecated. For current workflows, group chats with metadata and use the Vercel API for Vercel project environment variables, deployment lookup, logs, and deletion. Deployment tools publish or remove hosted applications; those effects should be requested explicitly.

## Migration and scope

v2 does not accept v1 chat IDs. Download the desired v1 version, unpack its archive, import up to 100 source files with `import_current_chat`, and save the old identifiers in metadata. Migration creates a new chat and does not preserve the old conversation history or create a deployment automatically.

Streaming, source editing, preview embedding, repository/ZIP imports for v2, MCP server administration, integration provisioning, and automatic deployment are outside this compact tool surface. v0 exposes native v1 hooks and v2 webhooks; this package does not register event subscriptions or expose triggers.

## Official references

- [Current API overview](https://v0.app/docs/api/v2)
- [Migration from v1 to v2](https://v0.app/docs/api/v2/guides/migrating-from-v1-to-v2)
- [Official current SDK and OpenAPI](https://github.com/vercel/v0-sdk)
- [Retained API v1 reference](https://v0.app/docs/api/v1)
- [Download v1 version source](https://v0.app/docs/api/v1/reference/chats/download-version)
- [Deployment log filtering and deprecation](https://v0.app/docs/api/v1/reference/deployments/find-logs)
