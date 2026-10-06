# Humanloop Integration Specification

## Provider status

Humanloop retired its platform on September 8, 2025. The official
[August 2025 announcement](https://humanloop.com/docs/changelog/2025/08)
states that the platform and account data became permanently inaccessible
after that date. The [migration guide](https://humanloop.com/docs/guides/migrating-from-humanloop)
confirms that accounts, Files, Versions, Logs, Evaluations, and settings were
to be permanently deleted. These pages remain available as historical
documentation; they do not establish a working API today.

## Retained tool contracts

Existing keys, action values, input fields and types, and output schemas are
retained for compatibility. Every tool invocation returns the same retirement
error before reading credentials or contacting a provider. None of the former
operations below is available.

| Tool key | Former capability | Historical official reference |
| --- | --- | --- |
| `manage_prompt` | Create, update, get, list, delete prompt files and versions | [Prompts](https://humanloop.com/docs/api/prompts/list) |
| `call_prompt` | Generate through the model proxy | [Call Prompt](https://humanloop.com/docs/api/prompts/call) |
| `manage_dataset` | Create, update, get, list, delete datasets; list datapoints | [Datasets](https://humanloop.com/docs/api/datasets/list) |
| `manage_evaluator` | Create, update, get, list, delete evaluator files | [Evaluators](https://humanloop.com/docs/api/evaluators/list) |
| `run_evaluation` | Create, get, list evaluations | [Evaluations](https://humanloop.com/docs/api/evaluations/list) |
| `manage_flow` | Create, update, get, list, delete flows | [Flows](https://humanloop.com/docs/api/flows/list) |
| `manage_tool` | Create, update, get, list, delete function tools | [Tools](https://humanloop.com/docs/api/tools/list) |
| `manage_logs` | List, get, delete logs | [Logs](https://humanloop.com/docs/api/logs/get) |
| `log_prompt_result` | Record externally generated prompt results | [Log to a Prompt](https://humanloop.com/docs/api/prompts/log) |
| `deploy_prompt` | Deploy, undeploy, list prompt versions | [Deploy Prompt](https://humanloop.com/docs/api/prompts/set-deployment) |
| `manage_directory` | Create, update, get, list, delete directories | [Directories](https://humanloop.com/docs/api/directories/list) |

No missing tools, identity endpoint, downloads, provider webhooks, or replacement
API are claimed. The former HTTP client has been removed. Legacy trigger
definitions and registrations have also been removed.

## Authentication and configuration

The `api_key` authentication key, its `apiKey` string input, and the `token`
string output schema remain compatible with stored connections. New
connection attempts return the retirement error without persisting the key.
There is no OAuth flow, scope request, or token refresh.

The optional `environment` string remains in the configuration schema for
stored-connection compatibility. It cannot enable any operations against the
retired service.

## Migration boundary

Only data exported before the shutdown can be used in a replacement platform.
The historical export guide cannot recover data from an unavailable API.
Choosing and configuring a replacement platform is outside this integration.
