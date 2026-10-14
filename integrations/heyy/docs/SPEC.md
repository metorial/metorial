# Heyy Integration

## Authentication

Create a bearer API key in your Heyy workspace under [Settings → API Keys](https://app.heyy.io/settings/api-keys). The same documented bearer authentication is used by both API versions. Connection profile verification retrieves the v2 business account.

- [API v2 authentication](https://docs.heyy.io/api-reference/v2/authentication)
- [API v3 authentication](https://docs.heyy.io/api-reference/v3/authentication)

## Supported workflows

The existing 16 tools preserve their API v2 inputs and outputs. They cover business information, channel discovery, contact listing and management, WhatsApp messaging, template discovery, broadcasts and recipient addition, chat listing and updates, and automation listing and invocation. Requests use the current documented API v2 server, `https://api.heyy.io/v2`.

Three read-only tools use the current API v3 server, `https://api.heyy.io/v3`:

- `get_workspace`: identify the workspace associated with the API key and inspect its timezone and availability.
- `get_contact`: retrieve contact names, messaging handles, subscription state, label IDs, attribute values, and associated chat IDs.
- `get_chat`: inspect chat status, unread state, assignments, sensitivity, and the latest message.

File upload, message-template creation, campaign editing, webhook management, and AI employee configuration are not exposed by this package. Media messaging requires a file ID already obtained from Heyy.

## API v2 sunset

Heyy's [versioning notice](https://docs.heyy.io/api-reference/v3/versioning) explicitly schedules API v2 retirement for **November 1, 2026**. Existing v2 tools and connection profile verification require a separate migration before that date. V3 changes list operations to search endpoints and renames broadcasts to campaigns and workflows to automations. The current refresh preserves existing public contracts rather than changing those meanings during this update.

## Provider references

- [Current v2 OpenAPI contract](https://docs.heyy.io/api-reference/openapi-v2.json)
- [Current v3 OpenAPI contract](https://docs.heyy.io/api-reference/openapi-v3.json)
- [Get workspace](https://docs.heyy.io/api-reference/get-workspace)
- [Get contact](https://docs.heyy.io/api-reference/get-contact)
- [Get chat](https://docs.heyy.io/api-reference/get-chat)
- [API v2 errors](https://docs.heyy.io/api-reference/v2/error-handling)
- [API v3 errors](https://docs.heyy.io/api-reference/v3/error-handling)
