# DocsBot AI integration

## Authentication and team discovery

Use a user API key with `Authorization: Bearer <key>`. The Admin API uses `https://docsbot.ai/api/`; question interactions use `https://api.docsbot.ai/`. API keys inherit the user's team permissions. OAuth and expiring embed tokens are not used by this integration.

Call `list_teams` without choosing a team. Pass a discovered `teamId` to team-scoped tools. Saved team IDs on older connections are accepted when the tool omits `teamId`. No team ID is required during connection setup. DocsBot has no documented current-user profile endpoint in the reviewed API pages; team discovery is the available account access check.

## Tools

| Workflow | Tools |
| --- | --- |
| Team discovery and usage | `list_teams`, `get_team` |
| Bot management | `list_bots`, `get_bot`, `create_bot`, `update_bot`, `delete_bot` |
| Source lifecycle | `list_sources`, `get_source`, `create_source`, `manage_source`, `delete_source` |
| Source uploads | `get_upload_url` |
| Questions and feedback | `ask_question`, `rate_answer`, `record_escalation`, `list_questions`, `delete_question` |
| Conversation history | `list_conversations`, `get_conversation`, `delete_conversation` |

Source listing uses the provider's `sources` and `pagination` response. `page` is zero-based; `limit` defaults to 100. Legacy array responses remain accepted. The bot list uses the documented legacy array response without query options, capped by the provider at 1,000 bots.

`get_source` returns the full supported source details, including FAQ pairs, indexed URLs, ingest warnings, and relative multi-file names and progress. `manage_source` sends a bodyless PUT for retrying failed sources or PATCH with `title` to change supported dashboard titles. Unsupported title updates return a provider conflict. An empty title clears the dashboard label.

File-based source creation requires uploading bytes with `get_upload_url` first. A multi-file document can instead reference an uploaded `fileDir` prefix ending in `/`; `file` and `fileDir` are mutually exclusive. Upload URLs are destinations for PUT requests, rather than file download links.

`ask_question` uses the non-streaming Chat Agent API and preserves the caller's conversation ID for follow-ups. `fullSource` exposes full citation text when returned. `rate_answer` and `record_escalation` require the provider's `true` acknowledgment. Question-level escalation remains supported, while conversation escalation is a separate provider API that this integration does not expose.

Question history preserves its string fields for deleted records by returning empty question/answer strings alongside the optional `deleted` flag; nondeleted content is preserved. Arbitrary metadata values are serialized to strings to retain the existing metadata field type. Nullable optional response values are omitted.

## Official documentation

- [Authentication](https://docsbot.ai/documentation/developer/authentication)
- [Teams](https://docsbot.ai/documentation/developer/team-api)
- [Bots](https://docsbot.ai/documentation/developer/bot-api)
- [Sources](https://docsbot.ai/documentation/developer/source-api)
- [Chat Agent](https://docsbot.ai/documentation/developer/chat-agent)
- [Answer rating and escalation](https://docsbot.ai/documentation/developer/answer-rating)
- [Question history](https://docsbot.ai/documentation/developer/questions-api)
- [Conversation history](https://docsbot.ai/documentation/developer/conversations-api)
- [API errors](https://docsbot.ai/documentation/developer/api-errors)
