# Zixflow Integration

## Authentication and API

Use the Zixflow App API at `https://api.zixflow.com/api/v1` with `Authorization: Bearer <API key>`. Create an API key under Settings > Workspace Settings > Developer > API Key and grant permissions for the workflows being used. Keys may expire or have IP restrictions; the API key flow has no OAuth refresh exchange. Existing stored `token` values and configuration values remain parseable.

The connection profile identifies the workspace returned by the workspace-member API. A workspace member is not treated as the authenticated API-key owner. `list_workspace_members` returns the accessible members and workspace IDs. The current App documentation has no current-user or current-key identity endpoint.

## CRM workflows

1. Call `list_collections` to discover People, Company, Deals, and custom collections.
2. Call `list_attributes` with target `collection` and the selected collection ID to discover API key names, required fields, types, and configuration. Use `list_attribute_options` for select/multiselect option IDs, or set optionType to status to discover status IDs.
3. Use `manage_collection_records` to create, get, query, patch, or delete records. Contacts are records in the People collection.
4. Call `list_lists`, then inspect list attributes with `list_attributes` using target `list`.
5. Use `manage_list_entries` to link a collection record to a list and create, get, query, patch, or delete list entries.
6. Use `manage_activities` for activity/task creation, retrieval, queries, updates, and deletion. Activity update supports icon changes as well as scheduling, association, and status fields.

Queries use `limit` and `offset` (defaults 10 and 0). Collection and entry queries accept the documented `filterObject` or the legacy `filter` array, which is combined with AND. Do not pass both. Sort uses provider objects such as `{ "direction": "asc", "attribute": "name" }`. Activity queries retain their array-filter form. No total count or next page is invented; advance the offset by the returned page length and stop on an empty or short page.

## Messaging workflows

- `list_whatsapp_resources` discovers connected accounts, templates, and template variables. Template-variable lookup requires phoneId, templateName, and language; language comes from the selected template.
- `send_whatsapp_message` sends templates or direct text/media/location payloads. Direct messages require an active recipient session as specified by WhatsApp. Media URLs are inputs to the provider.
- `get_rcs_template_variables` discovers the variables for a configured RCS bot. `send_rcs_message` supports templates and direct text/media requests.
- `send_sms` supports the existing transactional, promotional, and OTP routes, sender IDs, flash messages, and India DLT fields.
- `send_email` sends HTML/plain text to 1–10 recipients using a verified sender. Existing attachment IDs refer to files already uploaded to Zixflow; this integration does not upload or download those files.
- Messaging tools accept an optional `reportUrl` for delivery reports.
- `send_otp` submits 1–5 ordered channel attempts with a combined timeout at most 300 seconds. A timeout of zero can trigger attempts immediately. Channel-level report URLs are supplied in channelData; the top-level webhookUrl reports channel switching.
- `get_message_report` retrieves provider status for WhatsApp, SMS, or email using a message ID returned by Zixflow. Send responses expose message and campaign IDs only when the provider actually returns them.

A provider acknowledgment is separate from recipient delivery. Responses include the complete actual response in `raw`, including nulls and provider-specific metadata. Optional scalar summaries are omitted when the provider returns a null/object or no value; required strings are validated instead of replaced with placeholders. Update/delete IDs are never copied from request context into provider result fields.

## Scope

This package exposes the Zixflow App API as one product. Zixflow AI messaging, Sendflow, and event ingestion require distinct authentication and are not exposed under the App API key. Custom attribute administration, option administration, email uploads, and inbound webhook triggers are outside this refresh.

Official reference: [API index](https://docs.zixflow.com/llms.txt), [authentication](https://docs.zixflow.com/api-reference/authentication), [CRM filtering](https://docs.zixflow.com/api-reference/filtering-and-sorting).
