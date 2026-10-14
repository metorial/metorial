# Botsonic Integration Specification

## Authentication and resource selection

Account API Secret Keys are sent as `USER-API-KEY` to bot-management endpoints under `https://api.botsonic.ai/v1/business`. Bot-scoped endpoints use a bot API token in `X-BOT-KEY`.

For an account connection, use `list_bots` to discover a bot, then pass its `botId` to a bot-scoped tool. The integration retrieves the bot token using the documented bot API key endpoint; an optional `workspaceId` selects the workspace. A Bot API Token connection directly targets the token's bot and cannot run account-wide bot management.

Existing stored connections without a credential-type marker retain their token: account management uses it as an account key, while bot-scoped calls without a bot ID use it as a legacy bot token. Supply a bot ID to resolve a token from an account key, or reconnect using the appropriate authentication method.

## Supported workflows

- Discover, create, inspect, and delete bots. Bot creation maps the public `name` field to the provider's `bot_name` field.
- Generate synchronous responses with optional conversation history, response format, source content, and starter-question context.
- Upload file URLs, text, or batches of URLs; inspect training-data processing and delete entries. Upload acceptance does not imply processing completion.
- Create, list, update, and delete starter questions; retrieve the welcome message and starter presets.
- Create, list, and delete FAQs; inspect conversations and end chats with optional feedback.

Pagination totals and response message IDs are optional because the provider response schema does not require them. Page sizes and display order retain number schemas while checking whole-number values. All tools use object input schemas.

## Limits

API access is plan-dependent. The tools return synchronous responses; streaming is not exposed. Bot IDs supplied with a Bot API Token connection must correspond to the token's bot, particularly for file and text uploads. No event subscriptions are exposed by this integration. No suitable account-identity endpoint is present in the official API reference.

## Provider references

- [REST API guide](https://docs.botsonic.com/docs/rest-api)
- [Account API keys](https://docs.botsonic.com/docs/your-api-keys)
- [Bot discovery](https://docs.botsonic.com/reference/get_all_bots_v1_business_bot_all_get)
- [Bot API token retrieval](https://docs.botsonic.com/reference/get_bot_api_key_v1_business_bot__bot_id__bot_api_key_get)
- [Business response generation](https://docs.botsonic.com/reference/generate_sync_or_streaming_response_v1_business_botsonic_post)
- [Starter presets](https://docs.botsonic.com/reference/get_all_starter_presets_by_bot_id_v1_business_bot_starter_presets_all_get-1)
