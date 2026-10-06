# Synthflow AI API Specification

Synthflow provides AI voice agents for inbound, outbound, and widget conversations.

## Authentication

Create an API key under **Admin → Workspace Settings → API Keys**. Requests use
`Authorization: Bearer <api_key>`. Select the region matching your workspace:

| Region | API base URL |
| --- | --- |
| Global | `https://api.synthflow.ai/v2` |
| United States | `https://api.us.synthflow.ai/v2` |
| European Union | `https://api.eu.synthflow.ai/v2` |

See [Authentication](https://docs.synthflow.ai/authentication) and
[API introduction](https://docs.synthflow.ai/getting-started-with-your-api).

## Supported workflows

| Workflow | Tools | Provider contract |
| --- | --- | --- |
| Agent lifecycle | `list_agents`, `get_agent`, `create_agent`, `update_agent`, `delete_agent` | `/assistants`; nested `agent` settings use `voice_id`, `greeting_message`, and `redact_pii`. `max_duration` is an object with `duration_seconds` and `is_enabled`. |
| Call initiation and history | `make_call`, `list_calls`, `get_call` | `/calls`; list time filters use milliseconds since epoch. `get_call` can provide a downloadable recording when available. |
| Knowledge base lifecycle and assignment | `manage_knowledge_base` | `/knowledge_base`; attachment uses a `model_id` query parameter, while detachment sends it in the request body. |
| Knowledge sources | `manage_knowledge_base_source` | Add, list, update, and delete text, website, or hosted PDF sources. Updates retain the existing source type and require its text content or URL. |
| Voice and number discovery | `list_voices`, `list_phone_numbers` | `/voices`, `/numbers`; both require a workspace ID. Obtain `workspace_id` from a contact or simulation suite, or from your dashboard. |
| Contacts | `manage_contact` | `/contacts`; updates use PATCH. Lists support phone-number search and return provider page metadata; the current API does not expose offset pagination. |
| Custom actions | `manage_action` | `/actions`; create/update accept the documented body keyed by action type, such as `CUSTOM_ACTION`. Actions can be attached to and detached from agents. |
| Simulation runs and results | `run_simulation` | List `/simulation_suites`, execute a suite for its existing agent, then retrieve `/simulations/session/{id}`. |
| Usage analytics | `export_analytics` | `/analytics/` returns structured metrics. ISO datetime ranges cannot exceed 120 days. |
| Agency accounts | `manage_subaccount` | `/subaccounts`; call limits map to `concurrency`, and account limits support null. Creation results omit generated credentials and sign-in links. |

Set post-call callback URLs on agents using `create_agent` or `update_agent`.
The current `make_call` endpoint does not accept a per-call callback URL.
Calls require provisioned telephony and an outbound agent. Simulations and agency
operations may depend on account permissions or plan features.

## Official references

- [Create an agent](https://docs.synthflow.ai/api-reference/platform-api/agents/create-assistant)
- [Update an agent](https://docs.synthflow.ai/api-reference/platform-api/agents/update-assistant)
- [Make a call](https://docs.synthflow.ai/api-reference/platform-api/calls/voice-call)
- [List calls](https://docs.synthflow.ai/api-reference/platform-api/calls/list-calls)
- [Get a call](https://docs.synthflow.ai/api-reference/platform-api/calls/get-phone-call)
- [Knowledge base sources](https://docs.synthflow.ai/api-reference/platform-api/knowledge-bases/list-knowledge-base-sources)
- [Update a knowledge source](https://docs.synthflow.ai/api-reference/platform-api/knowledge-bases/update-knowledge-base-source)
- [Create an action](https://docs.synthflow.ai/api-reference/platform-api/actions/create-action)
- [Update a contact](https://docs.synthflow.ai/api-reference/platform-api/contacts/update-a-contact)
- [Execute a simulation suite](https://docs.synthflow.ai/api-reference/platform-api/simulations/execute-simulation-suite)
- [Get a simulation session](https://docs.synthflow.ai/api-reference/platform-api/simulations/get-simulation-session)
- [Analytics](https://docs.synthflow.ai/api-reference/platform-api/analytics/analytics-export)
- [Subaccounts](https://docs.synthflow.ai/api-reference/platform-api/subaccounts/create-subaccount)

Batch campaigns, chat, memory stores, phonebook configuration, number acquisition,
and the provider's own MCP configuration are outside this integration's current
tool surface.
