# Twilio Flex

Manage Flex messaging interactions, Conversations, TaskRouter routing resources and Studio execution history through 18 tools. Existing tool keys remain available.

Connect with a Twilio Account SID and Auth Token, or an API Key SID and Secret plus its Account SID. These server-side HTTP Basic credentials are distinct from browser/Flex access-token JWTs. API keys have resource/action permissions and product entitlements; no OAuth or refresh grant is invented. Account metadata is read from the native Flex configuration, without claiming a human user identity.

Requests use the documented default US1 service roots. Regional credentials are isolated. Non-US Conversations support and private-beta TaskRouter/Studio availability do not establish regional support for the complete Flex surface; no arbitrary or guessed host is accepted. The connection owns its Account SID, and configuration does not duplicate that field. Previously stored configuration fields do not override connection credentials.

Call `list_workspaces` before supplying a Workspace SID. List branches return one page, optional `nextPageToken` and `hasMore`. Keep the same resource, filters and page size when continuing. A Page index is not a substitute for a native token; some TaskRouter resources explicitly warn against page-index pagination.

`create_interaction` returns asynchronous acceptance. Use `get_interaction` and `manage_interaction_channel` to inspect native setup/failure status. Closing a channel leaves tasks in wrapping unless `routingStatus: "closed"` explicitly completes them; neither choice erases prior routing or communication effects.

Task updates cannot combine Attributes with a wrapping/completed transition; make separate explicit calls. Activity availability cannot be changed after creation. Legacy `interactionContextJson`, message `mediaContentType`, Task update `taskQueueSid` and participant update destination addresses are retained in schemas but refused locally because current official write contracts do not support them. Use native `interactionContextSid`, an existing `mediaSid`, routing workflows or explicit participant replacement as applicable. Unsupported combinations cause no hidden chained writes.

Conversations use the default Conversation Service. Native Conversation unique names remain supported, including numeric-looking names; nested operations resolve the exact returned SID through an authorized read. Sending a message or starting a Studio execution can cause irreversible communication and charges. Accepted requests do not establish delivery or completed workflow effects, and ambiguous writes are never automatically retried.

Programmable Chat in Flex reached end of life on **June 1, 2026** and may stop working. `manage_flex_flows` preserves its documented legacy CRUD for existing installations, with this limitation. Build new messaging workflows with Flex Conversations and Interactions; see the [official announcement](https://www.twilio.com/en-us/changelog/programmable-chat-in-flex-reaching-end-of-life-on-june-1--2026) and [migration guide](https://www.twilio.com/docs/flex/developer/conversations/programmable-chat-to-flex-conversations).

The API surface covers workspace discovery; configuration; interactions/channels/participants; workers, queues, tasks, workflows and activities; workspace/queue/worker statistics; conversations/participants/messages; and Studio flow/execution reads plus explicit execution creation. No configuration writes, subscription, media download, token creation or broader account administration is exposed.
