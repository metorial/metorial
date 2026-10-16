# Handwrytten integration specification

## Authentication

API key authentication sends the key directly in the `Authorization` header. Current documented operations use `https://api.handwrytten.com/v2`. Account discovery uses `GET /auth/getUser`; the documented account identifier is `id`. Connection configuration is empty and does not duplicate the credential.

## Available tools

| Capability | Tools |
| --- | --- |
| Account and credits | `get_current_user` |
| Card discovery | `browse_cards`, `get_card_details`, `list_card_categories` |
| Handwriting | `list_handwriting_styles` |
| Recipient addresses | `manage_address_book` with list, search, create, update, delete |
| Sender addresses | `list_return_addresses`, `manage_return_addresses` with create, delete, set_default |
| Address discovery | `list_countries`, `list_states` |
| Ordering | `send_card`, `manage_basket` with add, view, send, clear |
| Order lifecycle | `list_orders`, `get_order`, `cancel_order` |
| Optional contents | `list_gift_cards`, `list_inserts` |
| Reusable messages | `manage_templates` with list, get, create, update, delete |

Card pagination starts at zero and exposes the provider's next-page indicator. Basket ordering uses font IDs; existing font-label input also resolves through the handwriting list. Inline recipients include the message and scheduled send date. A saved recipient ID is resolved through the address book into the same documented inline address shape. Country IDs resolve to country names required by the basket endpoint.

Single-step orders require sender street, city, and postal code; US and Canadian senders also require state/province. Existing full-name inputs map to documented first/last-name fields. Use `get_order` for the order's current processing state. Cancellation is restricted by the provider to orders in `paid` status.

Profile, order details, country/state discovery, and sender management preserve provider information in their outputs. Card image URLs are preview metadata; this integration does not generate or download files.

## Compatibility and documented limits

The current public reference does not include the existing template endpoints, `GET /orders/listGrouped`, `GET /basket/listGrouped`, or `GET /creditCards/list`. Existing routes remain on their original `/v1` server. No replacement contract is invented. Grouped-history and template behavior needs live-account verification.

Sender-address updates are omitted because the current public request schema does not identify the address to update. Custom-card design, uploads, prospecting, QR codes, bundles, and test-mode changes are outside this focused tool set. No trigger support is claimed.

## Official references

- [API introduction and authentication](https://www.handwrytten.com/api/)
- [Complete API reference](https://www.handwrytten.com/api-redoc/)
- [Official OpenAPI contract](https://www.handwrytten.com/openapi.json), version 3.15.0
