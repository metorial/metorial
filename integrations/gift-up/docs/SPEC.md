# Gift Up! integration

Use an API key from the Gift Up! dashboard. `get_company` identifies the authorized account.

The integration includes gift card lifecycle and balance operations; order creation, search, updates, notes and posting; item and group management; financial reports; promotions; locations; and shipping-option discovery.

Use `list_orders`, `list_items`, `list_item_groups`, `list_locations`, and `get_shipping_settings` to discover identifiers before acting.

Transaction filters use occurrence dates. Legacy creation/update filters return an actionable error because transactions are immutable. Reports retain full original transactions in `raw` and expose compatible convenience fields.

Item updates accept the documented patchable fields. Other item fields and group `sortOrder` apply only at creation. Posting keeps existing gift card codes unless complete replacement mappings are supplied.

Test mode applies only to supported order, gift card, and report endpoints. Catalog and account settings are shared with live mode.

[Official API reference](https://developer.giftup.com/api)
