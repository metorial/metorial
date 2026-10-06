# Omnisend

The integration provides 16 tools for brand identity, contact discovery and updates, product and category catalogs, campaign and automation discovery, and customer events. It does not expose campaign sending, analytics exports, store connection, contact deletion or event-history deletion.

## API selection and authentication

`apiVersion` defaults to `v5` to preserve existing behavior. Explicitly select `2026-03-15` to use the current `/api/` base and required `Omnisend-Version` header. API keys use `X-API-KEY` in v5 and `Authorization: Omnisend-API-Key` in the current API. OAuth uses Bearer authorization in either version. These mappings follow the [migration guide](https://api-docs.omnisend.com/docs/migrate-from-v5-to-v2026-03-15) and [authentication reference](https://api-docs.omnisend.com/reference/authentication).

Authentication verifies brand identity through the documented current `GET /api/brands/current`, independently of tool API selection. Brand-read permission is required. `get_brand` itself requires the current API; it does not invent a v5 GET from the archived store-connection POST. Archived v5 documentation establishes the contract, not guaranteed ongoing service availability. A rejected or retired version fails explicitly without silently changing API versions. See [current brand discovery](https://api-docs.omnisend.com/reference/get_brands-current).

OAuth preserves returned refresh tokens and expiry metadata and supports the documented token endpoint. The provider OAuth guide describes long-lived access tokens despite showing expiry and refresh fields; actual token lifetime and refresh acceptance must be verified for the application. See [OAuth](https://api-docs.omnisend.com/reference/oauth).

## Tools and behavior

| Capability | Tools | Behavior |
| --- | --- | --- |
| Brand identity | `get_brand` | Current API only; returns provider brand identity. |
| Contacts | `create_contact`, `get_contact`, `list_contacts`, `update_contact` | Email-based creation/upsert and ID-based read/update. Shorthand identifiers map to the supported identifier DTO. Current tags replace the whole array; v5 tags append. Omitted tags stay unchanged. Welcome email is suppressed unless explicitly requested; other configured automations may still run. |
| Products | `create_product`, `get_product`, `list_products`, `delete_product`, `replace_product` | Complete variant-backed records. Replacement is full PUT, including variants. Create/replacement is followed by a provider read. Prices remain currency units. |
| Categories | `create_category`, `list_categories`, `delete_category` | Documented `product-categories` routes and category identifiers; continuation uses provider offsets. Review associations before deletion. |
| Campaigns and automations | `list_campaigns`, `list_automations` | Read-only discovery; page-size/cursor inputs require the current API. Scheduling time is separate from actual start time. |
| Customer events | `send_event` | HTTP 202 means asynchronous acceptance. Events can create/update contacts, trigger messaging and retain history. No automatic retry or erasure is promised. The HTTP contract supports contact ID, email or phone; contact-ID inputs map to the documented `contact.id` field. |

Contact cursor pagination preserves provider cursors and rejects invalid continuation origins. Products and categories retain the resource-specific offset API. All original tool keys, input field types and output field types remain available; optional current paging fields and category continuation were added.

Event UUID/time deduplication applies to historical ingestion rather than real-time idempotency. Checkout recovery and courier URLs use documented property names. Currency amounts are never divided by 100. See [events](https://api-docs.omnisend.com/reference/post_events), [REST event identifiers](https://api-docs.omnisend.com/docs/how-to-send-events-rest-api), [checkout events](https://api-docs.omnisend.com/reference/started-checkout), [products](https://api-docs.omnisend.com/reference/get_products), and [full product replacement](https://api-docs.omnisend.com/reference/put_products-productid).

## Errors and operational limits

Validation and upstream failures return safe service errors with numeric status information where available. Credential-bearing transport state and provider error bodies are concealed. Unknown write completion is reported conservatively. There are no retries for event ingestion or uncertain creates. Provider rate limits, permissions, subscription behavior and automation effects apply to every write.

There are no trigger registrations or file-producing tools in this package.
