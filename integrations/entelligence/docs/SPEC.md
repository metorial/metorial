# Entelligence integration specification

The provider is [Entelligence](https://entelligence.ai), the engineering platform whose current documentation is at [docs.entelligence.ai](https://docs.entelligence.ai).

## Supported interface

The integration uses the three existing HTTP routes in the provider-published [`@entelligence-ai/chat-widget`](https://www.npmjs.com/package/@entelligence-ai/chat-widget). The [official source](https://github.com/Entelligence-AI/chat-popup/blob/main/src/app/index.tsx) and published package version 0.0.29 identify the service as `https://entelligence.ddbrief.com` and repositories as `organization&repoName`.

| Tool key | Request | Behavior |
| --- | --- | --- |
| `chat_query` | POST `/repositoryAgent/`, bearer API key; `question`, `history`, `vectorDBUrl`, `enableArtifacts`, `advancedAgent`, `enableDocs`, `limitSources` | Buffers the provider's text response and separates source-reference sections from the answer. Existing options and defaults are retained; availability depends on the repository's service configuration. |
| `check_query_permission` | POST `/bot/allow-query`, JSON `ApiKey` and `VectorDBURL` | Requires a real boolean `allowed` response. The widget uses this to control owner submissions. Failures are reported rather than fabricated as denial. |
| `bot_query` | POST `/bot/send-query`, JSON `ApiKey`, `VectorDBURL`, `ChatHist`, `Question`, `UserEmail` | Sends a question to repository owners on Slack. `ChatHist` is a JSON string of question/answer pairs. HTTP success confirms submission acceptance, not AI generation or delivery. |

The original keys and input fields remain. `bot_query` retains the string `answer` and array `references` output fields and adds `submitted`; the answer is the provider's submission response text and references are empty. It is correctly marked as a write operation. `check_query_permission.repositoryUrl` remains for compatibility and is explicitly identified as an unverified configured address.

## Authentication and repository setup

The API-key auth method and required human-readable `organization` and `repoName` configuration match the provider's widget initialization contract. [API key administration](https://docs.entelligence.ai/administration/api-keys) is under Settings → API in the application. Repository indexing and owner Slack setup must be provisioned by an administrator. No suitable identity, discovery, indexing, resource CRUD, file export, or event-registration endpoint is documented for the widget interface.

Current [MCP instructions](https://docs.entelligence.ai/MCP) require deployment-specific configuration supplied by the application; no MCP URL is inferred from the older widget service. The [CLI reference](https://docs.entelligence.ai/cli/reference) is not a public REST contract. The integration does not invent endpoints for other product features. No triggers are registered.

## Errors and verification

All request failures use structured service errors with the provider operation and upstream HTTP status when available. Permission responses are validated and chat responses must contain an answer. Source headings are matched at line boundaries, and code-reference markup is separated from the answer.

The private live suite independently checks provider permission responses and uses known indexed repository facts for chat assertions. External owner submissions require an explicitly approved controlled Slack destination, readback, and deletion. No live verification is claimed without those credentials and prerequisites.
