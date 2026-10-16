# Instacart API coverage

This integration exposes the Developer Platform and Connect as separate tool categories with different credentials.

## Developer Platform

[Developer Platform](https://docs.instacart.com/developer_platform_api/api/overview/) uses an API key as an Authorization bearer token. The environment selects `https://connect.instacart.com` or `https://connect.dev.instacart.tools`.

| Tool | Operation |
| --- | --- |
| `create_recipe_page` | `POST /idp/v1/products/recipe` |
| `create_shopping_list_page` | `POST /idp/v1/products/products_link` |
| `get_nearby_retailers` | `GET /idp/v1/retailers` |

Page tools return the actual hosted page URL and complete provider response. These URLs are shopping pages, not file downloads. Reuse generated links until their contents change. Link expiration comes from the requested/provider policy; no expiration timestamp is fabricated.

The [recipe reference](https://docs.instacart.com/developer_platform_api/api/products/create_recipe_page/) documents ingredient measurements, brand and health filters, creator credit, and optional page settings. Legacy brand names map to `brand_filters`; legacy health attributes map to `health_filters`. New filter arrays take precedence when supplied. Values remain unmodified, including case. Product IDs and UPCs are mutually exclusive according to the API.

The [shopping-list reference](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page/) recommends `line_item_measurements`. The original quantity and unit inputs remain available. The [retailer reference](https://docs.instacart.com/developer_platform_api/api/retailers/get_nearby_retailers/) permits omitted retailer keys, names, and logo URLs; returned values are preserved when present.

## Connect fulfillment

[Connect](https://docs.instacart.com/connect/) is for retailer fulfillment. [Client credentials](https://docs.instacart.com/connect/api/access_tokens/) are exchanged with `POST /v2/oauth/token`. Access-token expiration uses the returned `expires_in`; renewal repeats the client-credentials grant with the saved scopes and server. No refresh-token grant is assumed. API keys do not use this renewal flow.

The optional authentication server overrides tool environment routing. Without it, legacy token exchange remains on the production server and tool requests retain their environment fallback. [Permissions](https://docs.instacart.com/connect/api/permissions_scopes/) associate fulfillment with `connect:fulfillment`. Post-checkout and account linking use other grant types and are not exposed by these credentials.

| Tools | API resources |
| --- | --- |
| `create_user`, `get_connect_user` | User address validation and lookup |
| `find_stores` | Delivery, pickup, and last-mile stores |
| `preview_service_options`, `list_cart_service_options` | Preview or completed-cart time slots |
| `reserve_time_slot` | Current ID or desired-window-reference reservation |
| `reserve_service_option` | Legacy cart-validation reservation |
| `create_order`, `get_order`, `cancel_order` | Delivery/pickup order creation and order retrieval/cancellation |
| `sandbox_advance_order` | Sandbox shoppers, batches, and workflow progression |

The [fulfillment overview](https://docs.instacart.com/connect/api/fulfillment/overview/) describes these resources. Cart requests accept an optional delivery address and current `item` codes. Existing `productCodes` requests retain their original representation for compatibility. Runtime validation applies to new code-selection and reservation branches. Original optional inputs and falsy omission behavior remain available.

Pickup previews accept `locationCode`, discovered with `find_stores` and `fulfillmentType: pickup`. The provider requires this store code; it remains optional in the tool for compatibility. Omitted or empty values retain the previous request behavior. Delivery previews ignore it.

Service-option IDs are represented as strings for compatibility with existing tools; the complete numeric provider ID remains in raw data. Immediate windows can omit scheduled start/end timestamps. Store flags are read from `flags`; undocumented store address and phone values are returned only when provided. Complete responses retain coverage flags, warnings, item metadata, and monetary amounts without currency conversion or invented fees.

[Get order](https://docs.instacart.com/connect/api/fulfillment/delivery/get_order/) accepts a retailer-generated order ID. Omitting it invokes the [deprecated list endpoint](https://docs.instacart.com/connect/api/fulfillment/delivery/get_orders/). The legacy [cart reservation](https://docs.instacart.com/connect/api/fulfillment/delivery/create_service_option_hold_with_cart/) remains available; [current reservation](https://docs.instacart.com/connect/api/fulfillment/delivery/create_service_option_hold/) and [desired-window reservation](https://docs.instacart.com/connect/api/fulfillment/delivery/create_desired_window_hold/) are exposed through `reserve_time_slot`. The current tool returns the provider's nested hold ID and actual expiration. The deprecated `reserve_service_option` input/output schemas, handler, route interpolation, and client method are frozen exactly to the prior release, including its flat response-field mapping and empty-expiry fallback. Those legacy mappings are compatibility debt and are not evidence of the current API response. It also retains environment routing rather than the optional assigned authentication server. Use `reserve_time_slot` for current ID/reference reservations; it does not accept cart or address fields. Reservations replace the user's prior hold.

The [sandbox API](https://docs.instacart.com/connect/api/sandbox/overview/) requires a development server. Batch creation sends an orders array and numeric shopper ID; progression returns `workflow_state`. Optional batch type selects delivery, pickup, last-mile, or pickup-runner workflows.

Connect customer lookup retrieves the customer ID supplied by the retailer. Neither documented product exposes a suitable credential-owner self/profile endpoint, so this integration does not fabricate an identity tool. It registers no webhook triggers. No live orders, payments, or sandbox actions were executed for this refresh.
