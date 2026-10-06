# Shipday

Manage delivery and pickup orders, fleet members, tracking and on-demand delivery through eight tools. Connect with the dispatcher API key from the Shipday dashboard's My Account section.

Order IDs and order numbers are distinct. Exact delivery edits and deletion use a fresh detail lookup; provide the current order number for an inactive order. Pickup reads prefer the documented native order ID. Partial edits preserve the current required fields and location coordinates. A current CARD payment maps to the edit API's credit_card value; a payment method that the edit API cannot represent requires an explicit supported selection after reconciling the order. Multi-step failures identify earlier accepted requests. A ready-to-pickup request can be accepted before its completion is readable.

Native fees, decimal strings and tracking measurements retain their provider units. On-demand assignment and cancellation can dispatch couriers and incur charges; cancellation binds the exact observed assignment and does not erase prior charges. These APIs do not provide an atomic assignment-version condition, so a concurrent replacement makes the outcome uncertain. Deletion confirms current absence and does not promise history erasure. Generated carrier login passwords are not returned.

The dispatcher API has no documented account identity endpoint. Partner credentials and APIs are separate. Tracking requires the documented Business Advanced entitlement and is limited to three requests per minute per tracking ID. See [the specification](SPEC.md) for current routes and compatibility limits.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
