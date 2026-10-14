# BotStar integration specification

## Authentication

The Public API uses the account-level token from `https://app.botstar.com/account/profile` as a Bearer token. Broadcasts use the optional bot-level token from the bot Settings page as the `token` query parameter. No account-self endpoint is documented in the Public API.

## Tools

- Bots: `list_bots`, `get_bot`, `create_bot`, `publish_bot`. Discover bot IDs with `list_bots`; new bots need a conversation flow built in the BotStar editor.
- Audiences: `get_user`, `update_user`, `create_user_attribute`. Find audience IDs in Reports & Insights > Audience. Custom user attributes are top-level keys in the Public API payload.
- Messages: `send_message` uses the Public API recipient/message/options payload; `broadcast_message` retains the bot-level broadcast endpoint and text-message array. Follow the connected channel's messaging policy.
- Bot attributes: `manage_bot_attributes` lists, creates, updates, or deletes bot-level variables.
- CMS: `list_cms_entities`, `get_cms_entity`, `manage_cms_entity`, `list_cms_items`, `get_cms_item`, `manage_cms_item`. Read entity field definitions before setting item values using their `unique_name` keys. Entity creation maps public `dataType` and optional `uniqueName` to provider `data_type` and `unique_name`; omitted `uniqueName` falls back to the field name. Optional `options` carries provider field options.

Reads accept `draft` or `live`. For compatibility, mutation tools retain the public `live` value and send the documented `draft,live` query value, updating both environments. Item list pagination accepts positive whole-number values while retaining the existing public number types.

## Official references

- https://apis.botstar.com/docs/
- https://apis.botstar.com/docs/public-api.yaml
- https://docs.botstar.com/docs/en/message-api
- https://docs.botstar.com/docs/en/json-formats/

The official OpenAPI currently lists a staging server. The existing production host `https://apis.botstar.com/v1` is retained. The integration does not expose browser-widget JavaScript methods or webhook triggers.
