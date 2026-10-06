# Retell AI Integration

Authenticate with a Retell API key from the dashboard. Requests use `Authorization: Bearer <API_KEY>`. There is no OAuth flow, tenant configuration, or public current-user endpoint in the documented API.

## Supported workflows

- Voice agents: create, get, update, delete, publish a draft version, and search/list unique voice agents with cursor pagination.
- Retell LLM response engines: create, get, update, delete unused engines, and list with cursor pagination. Create an engine before assigning its ID to a prompt-based voice agent.
- Calls: create browser calls with gateway connection details, make outbound phone calls, list/filter call history with pagination and date ranges, inspect transcripts and post-call analysis, delete records, and download recording variants.
- Batch calls: initiate or schedule a campaign with per-task agent overrides and dynamic variables.
- Phone numbers: purchase, get, list with pagination, update routing and country restrictions, and delete. Agent routing uses weighted lists with optional versions or environment tags.
- Knowledge bases: create from text or public URLs, list, inspect asynchronous indexing status, and delete.
- Voices and capacity: browse/filter the voice library and inspect account concurrency.

Recording download URLs may expire. Downloads can renew them by retrieving the call again. The call-details tool retains its recording URL metadata for compatibility.

Creating a web call registers a room; a browser must join with the returned access token, transport, ICE servers, and expiration. Outbound calls and campaigns require owned/imported numbers and approved destinations. Purchasing numbers and actual connected calls may incur charges.

Multilingual agents require the explicit `languages` locale array; single-language agents use `language`. The legacy `multi` scalar is unsupported by the provider.

## Boundaries

Chat/SMS, custom telephony import, conversation-flow authoring, voice cloning, simulation testing, and knowledge-source mutation are provider capabilities outside this integration's current tool surface. Event subscriptions are not exposed.

## Official references

- [API documentation index](https://docs.retellai.com/llms.txt)
- [Voice agent listing](https://docs.retellai.com/api-references/list-agents)
- [Call listing](https://docs.retellai.com/api-references/list-calls)
- [Browser call creation](https://docs.retellai.com/api-references/create-web-call)
- [Retell LLM creation](https://docs.retellai.com/api-references/create-retell-llm)
- [Knowledge base creation](https://docs.retellai.com/api-references/create-knowledge-base)
- [Publishing](https://docs.retellai.com/api-references/publish-agent)
- [Phone number listing](https://docs.retellai.com/api-references/list-phone-numbers)
