# Stoat integration

Stoat is the open source chat platform formerly called Revolt. This integration uses its REST API with either `X-Bot-Token` or `X-Session-Token` authentication.

New connections capture the API URL with their credentials. The [official endpoint page](https://developers.stoat.chat/developers/endpoints/) lists `https://api.stoat.chat` as the primary endpoint. The unfinished [migration guide](https://developers.stoat.chat/developers/stoat-migration-guide/) instead lists `https://stoat.chat/api`; supply the URL suitable for your deployment. Existing connections retain their legacy saved API URL, including self-hosted URLs. Hostless legacy credentials do not perform a profile lookup until reconnected with an API URL.

| Capability | Operations |
| --- | --- |
| Messages | Send, edit, fetch one/history, search, delete one/bulk, pin/unpin, reactions |
| Servers | Create, fetch, edit, delete/leave |
| Channels | Create server channel/group, fetch, edit, delete/leave, open DM, list DMs |
| Members | Fetch one/all, edit nickname/roles/avatar/timeout, kick, ban/unban/list bans |
| Roles and permissions | Create, fetch, edit, delete roles; set server/channel role and default permissions |
| Webhooks | Create, list, execute, edit, delete |
| Emoji | List server emoji, delete emoji |
| Invites | Create, fetch public details, list server invites, delete |
| Identity | `fetch_user` with `userId: "@me"`; optionally fetch its extended profile |

Message queries preserve pagination, sorting, and nearby search. `includeUsers` returns provider user and member records when supplied by the endpoint. Fetch/search limits must be whole numbers from 1 to 100; bulk deletion accepts at most 100 IDs. Legacy numeric schema types are retained. Legacy role `rank` inputs remain accepted and sent, but the current API documents that they have no effect.

Permission bitfields must fit a non-negative JavaScript safe integer. Server defaults and group defaults use `permissions`; role overrides and server-channel defaults use `allow` and `deny`. Permission changes replace the selected values.

Sending messages accepts previously uploaded file IDs. File upload, file download, bot account management, friendship/block management, voice sessions, and real-time event ingestion are outside this integration's tool surface. No polling or webhook event triggers are registered. Channel webhooks here are outgoing message resources.

Provider operations and schemas are documented in the [official OpenAPI specification](https://github.com/stoatchat/javascript-client-api/blob/main/OpenAPI.json). User sessions and bots have different endpoint and permission access; authorization failures are reported by the provider.
