# Insighto.ai API specification

Insighto.ai builds and operates conversational AI assistants, voice widgets, SMS and WhatsApp messaging, knowledge sources, contacts, forms, and outbound campaigns.

## Authentication

Generate an API key in Settings → API Keys. Keys begin with `in-`. Requests use `https://api.insighto.ai` and the `api_key` query parameter. The [API key guide](https://docs.insighto.ai/settings/api-tokens) explicitly requires query authentication. The generated [reference introduction](https://docs.insighto.ai/api/ragify) also lists Bearer authentication; this integration uses the query scheme documented by both sources.

## Available operations

- `who_am_i`: read the connected account profile.
- `list_assistants`, `manage_assistant`: discover, read, create, update, and delete assistants; inspect linked widgets and knowledge sources.
- `list_widgets`: discover configured deployment endpoints.
- `list_contacts`, `manage_contact`: read contacts, upsert by email or phone, update contact/channel/custom-field data, and delete contacts.
- `list_conversations`, `delete_conversation`: discover conversations by required date range or contact, inspect transcripts, and delete conversations.
- `make_call`, `disconnect_call`, `send_message`: initiate or disconnect a call, or send SMS/WhatsApp messages through configured widgets.
- `list_data_sources`, `manage_data_source`: discover, create, and delete knowledge sources; add text content or link a source to an assistant. File lists describe provider source records.
- `list_forms`, `manage_form`: discover and manage forms and inspect captured responses.
- `list_webhooks`, `manage_webhook`: manage outbound notification endpoints and inspect delivery logs. The provider currently documents one delivery attempt and no HMAC signature.
- `list_campaigns`, `manage_campaign`: discover campaigns, inspect status and schedules, create/update/delete scheduled outbound-call campaigns, attach contacts, and run campaigns through widgets.

## Request and response behavior

Paginated APIs return records in `data.items` and pagination totals in `data.total`. Page numbers begin at 1; ordinary page sizes range from 1 to 100. Existing numeric inputs remain numeric; invalid fractional page values receive an operation error.

Scheduled campaign creation requires a name, start timestamp, and integer scheduling interval. Campaign runs require recipient contact IDs, supplied directly or discovered from a saved campaign. A create/update followed by contact linking can leave the campaign saved if linking fails; inspect the campaign before retrying.

Form creation supplies all required body keys, including nullable trigger instructions and a collection style. Contact upserts send identity fields as query parameters; custom fields are saved through the contact update endpoint. Updating a contact's channel configuration uses `channels`.

The generated reference leaves some response bodies unspecified (including transcripts and messaging), and some legacy fields are absent from its current request schemas. Existing inputs remain available; omitted documentation alone is not treated as endpoint or field removal. Provider acceptance of those legacy fields requires live verification.

## Official reference

- [API reference](https://docs.insighto.ai/api/ragify)
- [Current account](https://docs.insighto.ai/api/get-my-data-api-v-1-user-get)
- [Contact upsert](https://docs.insighto.ai/api/upsert-contact-by-email-or-phone-number-api-v-1-contact-upsert-post)
- [Campaign creation](https://docs.insighto.ai/api/create-campaign-api-v-1-campaign-create-post)
- [Campaign run](https://docs.insighto.ai/api/run-campaign-api-v-1-campaign-run-widget-id-post)
- [Outbound webhook behavior](https://docs.insighto.ai/settings/webhooks)
