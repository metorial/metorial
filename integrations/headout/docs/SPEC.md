# Headout API Specification

The Headout partner API supports catalog discovery, inventory, booking creation and capture, and asynchronous cancellation and reschedule requests. Official reference: [Headout API](https://developers.headout.com/docs/api/).

## Authentication and environments

All requests use HTTPS and the `Headout-Auth` API-key header. Obtain keys through the Headout partner program. Production keys use the `pk_` prefix and testing keys use `tk_`; use each in its matching environment.

- Production: `https://www.headout.com`
- Sandbox: `https://sandbox.api.dev-headout.com`

The connection stores the API key. Configuration selects the environment, default language, and optional pricing currency. The API does not document a current-user/profile endpoint or OAuth flow.

## Tools and requests

| Tool | Endpoint | Behavior |
| --- | --- | --- |
| `list_cities` | `GET /api/public/v1/city` | Discover city codes with offset/limit pagination. |
| `search_products` | `GET /api/public/v2/products` | Search by required city and optional category, subcategory, collection, campaign, language, currency, offset and limit. |
| `get_product` | `GET /api/public/v1/product/get/{productId}` | Read content, variants, required booking fields, and policies; supports `fetch-variants`, language and currency. |
| `list_categories` | `GET /api/public/v2/categories` and optionally `/subcategories` | Discover category and subcategory IDs and their relationship. |
| `list_collections` | `GET /api/public/v2/collections` | Discover collections with offset/limit pagination. |
| `get_inventory` | `GET /api/public/v1/inventory/list-by/variant` | Read variant slots and per-person/group pricing; optional date range, currency, offset and limit. |
| `create_booking` | `POST /api/public/v1/booking` | Create an `UNCAPTURED` booking, optionally capturing immediately. Include the parent `productId`, variant, inventory, customers, and expected total price/currency. |
| `get_booking` | `GET /api/public/v1/booking` or `/booking/{id}` | List bookings or read one booking, including status, customers, voucher and tickets. |
| `capture_booking` | `PUT /api/public/v1/booking/{id}` | Set status to `PENDING` and optionally assign a partner reference. |
| `cancel_booking` | `POST /api/public/v2/bookings/{bookingId}/cancel/` | Submit a cancellation reason and optional comment. |
| `reschedule_booking` | `POST /api/public/v2/bookings/{bookingId}/reschedule/` | Submit new local start/end times and an optional comment. |

## Booking flow

1. Discover a product and read its variant input fields. Collect fields at the documented primary-customer or all-customer level, including any required location choice IDs.
2. Refresh inventory and pricing immediately before booking. Inventory IDs are specific to a date/time slot and differ from product and variant IDs.
3. Create the booking with customer details and expected total price/currency. The primary customer needs the product-required name, email, phone, and other fields.
4. Capture an `UNCAPTURED` booking within one hour. `PENDING` starts fulfillment; it does not mean tickets are ready. If automatic capture fails, use the returned booking ID in the error to check the existing booking before retrying.
5. Use `get_booking` until a final status is available. Voucher links remain in the booking response; PDF ticket URLs are provided as downloadable files when returned by Headout.

Cancellation and reschedule acknowledgements confirm submission only. Headout processes these requests asynchronously and applies ownership, policy, and availability checks. A rejected acknowledgement is reported as a failure. Poll `get_booking` to confirm the final outcome.

## Response compatibility

Existing tool names and input types remain stable. `productId` is an additive optional input on `create_booking` for compatibility with existing v1 calls; include it for new requests. Price fields remain optional for compatibility, but Headout recommends always sending the price object; supplied amount and currency must be paired, with the configured default currency available as a fallback.

Normalized outputs retain stable IDs and existing field types. Full provider responses are included alongside normalized product, inventory, booking, and listing data, preserving policies and additional fields. Nullable provider fields are omitted from normalized optional fields. Input-field choice IDs remain strings, including IDs for predefined pickup locations; complete location labels and constraints remain in the full product response. Booking creation timestamps are Unix seconds.

## Other documented capabilities

The provider also documents v2 booking/catalog alternatives, normal/seatmap date availability, seat selection, and booking-status webhook configuration. This integration exposes no triggers. Webhook delivery and registration require separate lifecycle and callback verification. Pagination returns an optional next offset; a null provider offset marks the final page.
