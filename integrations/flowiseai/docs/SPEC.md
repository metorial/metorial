# Flowise API Integration

The integration connects to an existing Flowise instance at its application URL or `/api/v1` base URL. Use an API key generated in the instance with permissions for the required operations. Current Flowise servers resolve the key's workspace and enforce its permissions for management APIs. Dashboard cookie sessions are a separate authentication mechanism.

## Capabilities

| Workflow | Available operations |
| --- | --- |
| Chatflows | List, retrieve, create, update, delete; current servers support list pagination and flow-type filters. |
| Prediction | Send a question or Agentflow V2 form, pass history and session configuration, include supported upload inputs, and resume human checkpoints. Returns a complete response. |
| Assistants | List, retrieve, create, update, delete. Custom assistants store configuration locally; OpenAI and Azure assistants require provider credentials configured in the instance. |
| Custom tools | List, retrieve, create, update, delete custom function definitions. |
| Variables | List, create, update, delete static or runtime variables. |
| Document stores | List, retrieve, create, update, delete; index configured document sources; retrieve chunk pages; query indexed documents; delete record-manager-tracked vectors. |
| Conversation data | Retrieve or delete messages, submit and list feedback, create and list leads, and retrieve vector-upsert history. |
| Health | Check that the instance responds. |

Document-store ingestion accepts JSON loader and component configuration. Use an existing `docId` to reuse saved loader configuration. New stores need configured embedding and vector-store components. File uploads to this endpoint are not exposed. Deleting stored chunks or the document store does not delete external vectors; delete tracked vectors first. Vector deletion requires record-manager-backed ingestion.

Older response fields that describe JSON strings continue to return JSON strings when the provider supplies parsed objects. List tools preserve array-based responses and expose pagination metadata on current servers. Assistant listing supports a type filter and does not use pagination.

There is no current-user endpoint in the documented public API. The integration does not register events or webhooks.

## Official references

- [API reference](https://docs.flowiseai.com/api-reference)
- [Chatflows](https://docs.flowiseai.com/api-reference/chatflows)
- [Prediction](https://docs.flowiseai.com/api-reference/prediction)
- [Assistants](https://docs.flowiseai.com/api-reference/assistants)
- [Document stores](https://docs.flowiseai.com/api-reference/document-store)
- [Tools](https://docs.flowiseai.com/api-reference/tools)
- [Variables](https://docs.flowiseai.com/api-reference/variables)
- [Conversation messages](https://docs.flowiseai.com/api-reference/chat-message)
- [Feedback](https://docs.flowiseai.com/api-reference/feedback)
- [Leads](https://docs.flowiseai.com/api-reference/leads)
- [Vector upsert](https://docs.flowiseai.com/api-reference/vector-upsert)
- [Upsert history](https://docs.flowiseai.com/api-reference/upsert-history)
- [Server authentication middleware](https://github.com/FlowiseAI/Flowise/blob/main/packages/server/src/index.ts)
