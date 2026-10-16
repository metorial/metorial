# FinerWorks Integration Specification

FinerWorks provides print-on-demand production, custom framing and order fulfillment through one API. This integration uses the current `https://v2.api.finerworks.com/v3` endpoints.

## Authentication and account setup

Supply the `web_api_key` and `app_key` from the [account API settings linked from Getting Started](https://v2.api.finerworks.com/Documentation). Both credentials are sent in request headers. Connection verification calls `GET test_my_credentials` with the documented credentials body and identifies the actual connected account. `who_am_i` exposes the account ID, username, email and available setup flags without exposing the echoed API key.

The existing `testMode` setting defaults to false. Enabling it marks submitted orders as test orders; account application-key settings can also enforce test mode. Production orders may be billed and manufactured. The optional `paymentToken` on `submit_orders` is a payment processor token, `invoice` for accounts explicitly enabled for invoice payment, or `xxxx` to force simulated testing. No payment method is invented or selected by the integration.

## Tools

| Tool | Purpose and endpoint |
| --- | --- |
| `who_am_i` | Connected account identity, `GET test_my_credentials` |
| `list_orders` | Search orders, discover IDs/GUIDs/emails and reconcile uncertain submissions, `POST list_orders` |
| `get_order` | Receipt, recipient, items and totals by order GUID/email, `GET get_order` |
| `submit_orders` | Submit or validate 1–5 orders, `POST submit_orders_v2` |
| `get_order_status` | Production and shipment status by IDs or purchase order references, `POST fetch_order_status` |
| `update_order` | Hold, cancel or release an order before production, `PUT update_order`; optionally add a reference note, `POST submit_note` |
| `update_customer` | Update an order recipient, `PUT update_customer` |
| `get_shipping_options` | Quote one order using `POST list_shipping_options_multiple` with an orders envelope |
| `validate_address` | Validate and normalize a recipient, `POST validate_recipient_address` |
| `get_prices` | Price 1–50 items using a products envelope, `POST get_prices` |
| `get_product_details` | Retrieve 1–25 inventory SKU details using a products envelope, `POST get_product_details` |
| `browse_catalog` | Product, media and style discovery, `POST list_product_types`, `list_media_types` or `list_style_types` |
| `list_virtual_inventory` | Paginated SKU discovery by text, SKU, product code, product type or image GUID, `POST list_virtual_inventory` |
| `list_images` | Paginated inventory image discovery, `POST list_images` |
| `add_images` | Import up to five image URLs, `POST add_images` |
| `update_images` | Update titles/descriptions, `PUT update_images` |
| `delete_images` | Delete inventory images, `DELETE delete_images` |
| `browse_framing` | Frame collections, mats and glazing, `POST list_collections`, `list_mats` or `list_glazing` |
| `build_frame` | Validate/price a frame product code and optionally create a downloadable PNG/JPEG preview, `POST frame_builder` |
| `list_order_status_definitions` | Production status IDs and labels, `GET list_order_status_definitions` |

Existing tool keys and input/output field contracts are retained. New inputs and outputs are optional additions. The current image API accepts at most 50 results per page; the older schema's upper bound of 100 remains compatible, with a clear runtime validation failure for unsupported page sizes. Numeric identifier fields keep their existing schemas and validate integer requirements at invocation time.

## Order workflow and retry behavior

1. Discover SKUs using `list_virtual_inventory` or build product codes using the catalog and framing references.
2. Validate recipient addresses and obtain shipping options. Prefer the returned numeric `shippingId` converted to a string for the order's `shippingCode`; legacy classification codes remain accepted as input.
3. Optionally validate orders without submitting using `validateOnly`.
4. Submit orders with unique purchase order references and the desired payment token. Image URL inputs are sent in the documented product image object; optional pixel dimensions can be supplied.
5. Retain returned order IDs, confirmation IDs and available GUID/email values. A partial response returns confirmed orders and `success: false`. Check `list_orders` before retrying; resubmit only purchase order references that were not accepted.

If transport fails after submission, acceptance may be uncertain. Inspect `list_orders` before retrying. If a status change succeeds but adding its note fails, the error identifies the completed status change and directs a retry of the note alone. Notes are for reference and do not send instructions to production or customer support.

## Images and previews

Image updates and deletions can remove virtual inventory products associated with the image. Image listings retain actual thumbnail, preview and high-resolution URLs and complete provider metadata. Frame previews are generated image files returned by FinerWorks as encoded bytes; the integration validates PNG/JPEG content and provides a downloadable file. Encoded file contents are excluded from structured preview output, while frame, mat, glazing, total price and other metadata remain available. No URL expiry is assumed.

## Errors and response data

HTTP failures and rejected provider statuses become structured service errors containing available provider messages and codes. Address validation can return `valid: false` as a normal negative validation result. Validation-only order submission may legitimately return no confirmations. Required IDs and prices are taken from provider data; missing required response data produces an explicit error, never a manufactured zero or empty identifier. Optional scalar mappings preserve genuine zero, false and empty-string values, with raw provider metadata retained where available.

## Scope

The tools cover one fulfillment API; tool categories are unnecessary. No trigger is registered. An existing order callback URL can be passed during submission, but this integration does not receive or verify callbacks. Account editing, billing transactions, application-key administration, galleries, templates and pending-cart management are outside this tool set.

## Official references

- [Current API reference](https://v2.api.finerworks.com/Help)
- [Getting started, credentials, test mode and shipping IDs](https://v2.api.finerworks.com/Documentation)
- [Getting started and API setup](https://api.finerworks.com/Documentation)
- [Order submission](https://v2.api.finerworks.com/Help/Api/POST-v3-submit_orders_v2)
- [Order search](https://v2.api.finerworks.com/Help/Api/POST-v3-list_orders)
- [Order receipt](https://v2.api.finerworks.com/Help/Api/GET-v3-get_order_order_guid_order_email)
- [Virtual inventory](https://v2.api.finerworks.com/Help/Api/POST-v3-list_virtual_inventory)
- [Frame preview and pricing](https://v2.api.finerworks.com/Help/Api/POST-v3-frame_builder)
- [Render options](https://v2.api.finerworks.com/Help/ResourceModel?modelName=frame_render_config)
