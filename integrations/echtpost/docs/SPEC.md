# EchtPost integration specification

This integration uses [EchtPost REST API v2](https://api.echtpost.de/v2/docs), with the [official OpenAPI document](https://api.echtpost.de/v2/openapi.json) as its endpoint and schema reference.

## Connection

Create an API key under **Account → API keys**. Requests use the `X-Api-Key` header against `https://api.echtpost.de/v2`; credentials are never added to URLs. The current API-key connection supports server-side automation. OAuth-based user authorization is not included.

Sandbox keys do not bill or print postcards and isolate contacts, groups, and cards from live data. Live mailings require prepaid credit.

## Tools

- `who_am_i` and `get_credits`: identify the connected account and read balance and pricing.
- `list_contacts`, `get_contact`, `create_contact`, `update_contact`, and `delete_contact`: manage recipients, addresses, external references, and group membership.
- `list_groups`, `get_group`, `create_group`, `update_group`, and `delete_group`: discover and manage recipient groups.
- `list_templates` and `get_template`: find saved templates and their content, font, motive, and preview links when available.
- `send_postcard`: schedule postcards from a saved template using inline recipients, existing contact IDs, recipient groups, or a combination.
- `list_cards`, `get_card`, and `cancel_card`: inspect mailing status and queue asynchronous cancellation when still possible.

List operations return one page and expose the provider's total count, total pages, and pagination links when present. Contacts support search, country/group/external-reference filters, sorting, and related group/card IDs. Cards support status/date/motive filters. Group memberships can be replaced with `groupIds` or augmented with `groupNames`. New contacts using a custom greeting need a custom salutation. On update, omitting the salutation retains its stored value; the provider validates the resulting contact.

## Recipient and scheduling behavior

Inline recipients and new contacts need a last name, street, postal code, city, and two-letter country code. Existing optional input fields remain optional for compatibility; missing values required by the current provider API produce a clear validation error. No country is assumed.

The scheduled date controls printing, not arrival at the recipient. Templates supply the text and design. A notification uses `notificationType` and `notificationEmail`, plus an optional reminder date; the existing `after_send` option maps to the provider's `after_sent` notification type.

Cancellation is queued asynchronously. A successful cancellation request confirms acceptance; inspect the postcard again for its resulting status. Contact and group deletion require a confirmed no-content response. Provider errors retain status and corrective detail, with credential echoes redacted.

## Returned data and boundaries

Existing tool keys and field types remain available. Contact, group, template, and card results include the complete provider response for metadata and relationship IDs. Documented null company names and template preview links are omitted from legacy string fields and remain null in the complete response. Malformed objects, lists, required identifiers, and incompatible field values produce errors instead of fabricated successful results.

Preview links remain links. No tool downloads or generates image or print files. Custom-content cards, text-fit checks, motive browsing/uploads, OAuth setup, and webhook triggers are outside this integration's current scope. EchtPost advertises account-configured `card.sent` webhooks; this package does not register or receive them.
