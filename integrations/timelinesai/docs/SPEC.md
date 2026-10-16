# TimelinesAI API specification

The integration uses the [TimelinesAI Public API](https://timelinesai.mintlify.app/public-api-reference/overview) at `https://app.timelines.ai/integrations/api`.

## Authentication

Generate a workspace API token in **Integrations > Public API** and supply it as a Bearer token. The token covers the workspace; no separate workspace ID is required. The authentication profile uses workspace teammate information and does not identify the person who generated the token.

## Supported workflows

- Send messages by phone, chat ID, chat name, or JID, with optional uploaded files.
- List and filter chats, inspect and update a chat, change labels, and add internal notes.
- Retrieve chat messages and individual messages, including delivery status history.
- Read and set emoji reactions.
- Upload files from provider-supported public URLs, list files, retrieve downloadable files, and delete files.
- Discover connected WhatsApp accounts, workspace teammates, quotas, and workspace identity.
- Manage webhook subscriptions. Event names are passed to the provider without a restrictive enum.

The API accepts a public URL for upload; TimelinesAI downloads it. Downloadable file results use the documented temporary URL from `GET /files/{file_uid}`, renewed by the same stable file UID. Those URLs are documented as valid for 15 minutes, with renewal scheduled one minute early.

## Boundaries

The integration covers the workspace Public API. Partner provisioning and WABA APIs are separate products and are not included. Creating groups or changing group membership is not advertised by this integration. Legacy request routes and existing tool fields remain available.

The [workspace endpoint reference](https://timelinesai.mintlify.app/public-api-reference/overview#available-endpoints) documents `GET /workspace`. Its detailed reference was unavailable during this audit, so the new read-only workspace tool preserves the actual returned object without assuming its fields. Existing quota reads continue to use `/workspace/quotas`.
