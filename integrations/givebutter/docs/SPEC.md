# Givebutter Integration

Givebutter's public REST API is used for nonprofit fundraising and donor management. Requests use HTTPS and an API-key Bearer header. Generate a key in **Settings → Integrations → API Keys**; its permissions determine available resources. There is no OAuth or token refresh in this integration. Connection configuration contains no account or resource IDs.

## Supported workflows

- **Account:** `get_account` calls `GET /sso/v1/account` to identify the connected account and return its organization profile.
- **Campaigns:** list, retrieve, create, update, and delete. Updates use `PUT /v1/campaigns/{id}` and support publication and public visibility. Campaign goals must be non-negative integers at runtime.
- **Contacts:** list/filter, retrieve, create, update, archive, and restore. Updates use PUT; restore uses PATCH. `manage_contact_tags` adds, removes, or synchronizes a non-empty tag list. Archive and restore must be performed separately from profile edits. Archive reads the resulting provider record to report actual timestamps.
- **Transactions:** list/filter, retrieve, and record manual payments without charging the donor. The existing numeric amount is serialized as the provider's numeric-string field without rescaling. Existing campaign IDs and fund IDs are resolved to the campaign and fund codes required by the current create endpoint. Address fields are flattened, `in_kind` maps to the provider's `in-kind` value, and an omitted transaction timestamp is filled with the current time before submission.
- **Funds:** list, retrieve, create, update, and delete. Code-only updates retrieve the current name required by the provider's PUT endpoint.
- **Recurring plans and payouts:** list and retrieve. Payout completion uses the provider's `paid_at` field.
- **Tickets:** list and retrieve attendee tickets. Check-in uses `checked_in_at`. `get_ticket` prepares a downloadable PDF when Givebutter supplies a valid HTTPS PDF URL; the original `pdf` metadata field remains available with credential values redacted. URL expiry is not documented, so no expiry or automatic renewal is invented.
- **Campaign participation:** list peer-to-peer members and teams.

Every list tool accepts `page` and optional `perPage` (1–100) and returns actual total count/current page/last page. Contact searches support email, first/last name, tags, and update timestamp. Transactions support transaction timestamps, contact, payment method, and scope filters; current scope values are `all`, `benefiting`, and `chapters`.

## Compatibility and limits

The original 24 tool keys and all original input/output field types, null branches, enums, defaults, and input requiredness remain intact. Four documented optional outputs (campaign event/logo and payout address in detail/list tools) may be omitted; their present types and null branches are unchanged and original provider records are retained under `raw`. `get_account`, `get_fund`, and `manage_contact_tags` are additive. Missing or malformed required provider data produces a service error instead of fabricated IDs, zero totals, empty arrays, or timestamps. Actual null values remain null. Numeric provider IDs are checked before conversion to the original numeric output fields; unrepresentable IDs fail rather than losing precision. Decimal contribution strings and recognizable boolean values are normalized to the existing numeric/boolean contracts.

Create-contact email and phone objects retain their existing public input shapes. The provider's current creation schema accepts arrays of values, so optional legacy type labels are not sent. The update endpoint supports richer email/phone objects, but that functionality is not exposed here. Some generated API response schemas describe historically structured fields (for example tags, addresses, campaign covers, and transaction UTM parameters) as strings. The integration preserves its established structured output contracts and rejects incompatible values rather than inventing a conversion.

No webhook triggers are registered. Household management, contact activities, campaign ticket types/discounts, pledges, messages, webhook administration, and transaction editing are documented provider surfaces outside this integration's practical scope. No undocumented mutations are inferred for recurring plans, tickets, or payouts.

## Official sources

- [Documentation index](https://docs.givebutter.com/llms.txt)
- [Current OpenAPI document](https://givebutter.com/docs/api.json)
- [Authentication](https://docs.givebutter.com/api-reference/authentication), [pagination](https://docs.givebutter.com/api-reference/pagination), and [errors](https://docs.givebutter.com/api-reference/errors)
- [Account identity](https://docs.givebutter.com/api-reference/sso-accounts/get-ssov1account)
- [Campaign update](https://docs.givebutter.com/api-reference/campaigns/update-a-campaign)
- [Contact creation](https://docs.givebutter.com/api-reference/contacts/create-a-contact), [update](https://docs.givebutter.com/api-reference/contacts/update-a-contact), [restore](https://docs.givebutter.com/api-reference/contacts/restore-a-contact), and [tags](https://docs.givebutter.com/api-reference/contact-tags/add-tags-to-a-contact)
- [Create transaction](https://docs.givebutter.com/api-reference/transactions/create-a-transaction), [get fund](https://docs.givebutter.com/api-reference/funds/get-a-fund), [get ticket](https://docs.givebutter.com/api-reference/tickets/get-a-ticket), and [get payout](https://docs.givebutter.com/api-reference/payouts/get-a-payout)
