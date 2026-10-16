# Zylvie Integration Specification

## Authentication and identity

Use an API key from **Settings > API** as an HTTP Bearer token. The base URL is `https://api.zylvie.com`. Authentication profile lookup and `get_account` use the documented `GET /me` endpoint, returning the authenticated account email and brand. There are no OAuth scopes or refresh tokens and no connection configuration fields.

## Tool surface

| Area | Tools | Provider routes |
| --- | --- | --- |
| Identity | `get_account` | `GET /me` |
| Products | `create_product`, `update_product`, `delete_product` | `POST /products/create`, `PUT /products/update`, `DELETE /products/delete` |
| Coupons | `create_coupon`, `update_coupon`, `delete_coupon`, `list_coupons` | `POST /coupons/create`, `PUT /coupons/update`, `DELETE /coupons/delete`, `GET /coupons/list` |
| Eligibility | `grant_coupon_eligibility`, `get_coupon_eligibility` | `POST /coupons/grants`, `GET /coupons/grants` |
| Licenses | `verify_license_key`, `redeem_license_key`, `refund_license_key` | `GET /licensekeys/verify`, `POST /licensekeys/redeem`, `POST /licensekeys/refund` |
| Subscriptions | `verify_subscription` | `GET /subscriptions/verify` |

All original tool keys and schema field types are retained. Existing normalized fields remain available; additive `raw` outputs retain provider metadata, with account credentials removed. Required response fields are validated without manufacturing empty collections, boolean values, timestamps, or nulls.

## Product workflows

Products support one-time, subscription, and delayed pricing. Creating subscription pricing requires a billing interval and integer interval count. Updates only send explicitly supplied fields. Supplied category, tag, image, and file arrays replace the existing arrays. `useUploadedLicenseCodes` enables the dashboard’s uploaded CSV code pool when license issuance is enabled. Product file URL inputs configure fulfillment; no tool exports or downloads customer files.

Deletion can archive products with paid transactions or active subscriptions. The actual provider status and message are returned without claiming deletion when an archive occurred.

## Coupon workflows

Create/update support percentage or fixed discounts, product scoping, usage limits, dates, affiliates, subscription restrictions, `limitOnePerEmail`, and `validForDays`. `durationInMonths` is passed through to the provider: its documentation describes discounted charges and warns that repeating discounts for weekly/yearly products do not always map one-to-one to charges. Existing number input schemas remain numbers; integer provider fields are checked at runtime.

`list_coupons` returns all coupons in the selected active or archived group; the documented endpoint has no pagination controls. Setting `includeArchived` to true retrieves archived coupons instead of merging groups.

Eligibility tools accept a coupon ID from `list_coupons` or a coupon code and a customer email. The grant operation can optionally specify an ISO eligibility timestamp. Repeating a grant keeps the original grant date; it does not renew a window. The global coupon end date still applies. Coupon deletion can archive previously used coupons, reflected in the provider’s message.

## Licenses and subscriptions

License keys may be auto-generated UUIDs or uploaded custom strings. Verification includes product and purchaser identity. Redeem/refund recognize provider error bodies even when an HTTP request succeeds. Refunding invalidates the software key; it is not documented as a payment refund. Subscription verification returns the provider’s billing amount in the smallest currency unit, status, dates, and product/customer data. Exact returned nulls are preserved.

## API boundaries

HTTP and provider-declared errors become structured service failures, preserving upstream status/code and nested validation paths where available. No webhook triggers are registered. Provider webhook APIs exist separately; this integration does not advertise an event subscription surface.

## Official references

- [Authentication](https://developers.zylvie.com/)
- [Account](https://developers.zylvie.com/me)
- [Create product](https://developers.zylvie.com/products/create), [update product](https://developers.zylvie.com/products/update), [delete product](https://developers.zylvie.com/products/delete)
- [Create coupon](https://developers.zylvie.com/coupons/create), [update coupon](https://developers.zylvie.com/coupons/update), [delete coupon](https://developers.zylvie.com/coupons/delete), [list coupons](https://developers.zylvie.com/coupons/list), [email grants](https://developers.zylvie.com/coupons/grants)
- [Verify license](https://developers.zylvie.com/licensekeys/verify), [redeem license](https://developers.zylvie.com/licensekeys/redeem), [invalidate license](https://developers.zylvie.com/licensekeys/refund)
- [Verify subscriptions](https://developers.zylvie.com/subscriptions/verify)
