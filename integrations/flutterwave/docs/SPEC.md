# Flutterwave API v3 capabilities

This integration retains 16 original tools and adds `get_virtual_account` and `get_bill_payment`. Current Flutterwave documentation continues to support v3; v4 is a separate optional migration, not a silent replacement.

| Workflow | Tools |
| --- | --- |
| Transactions and collection fees | list_transactions, verify_transaction, get_transaction_fee |
| Payouts and rates | create_transfer, list_transfers, get_transfer_rate |
| Recurring billing | manage_payment_plans, manage_subscriptions |
| Virtual accounts | create_virtual_account, get_virtual_account |
| Bills | list_bill_categories, pay_bill, get_bill_payment |
| Refunds and settlement | create_refund, list_refunds, list_settlements |
| Bank discovery and recipients | resolve_bank_account (banks/branches/resolution), manage_beneficiaries |

Only API v3 Secret Keys authenticate this surface. Select the matching sandbox or production mode. The preserved deprecated `oauth_v4` option fails locally with reconnection guidance; no access token is exchanged, placed in a redirect, or sent to v3.

Paginated tools expose returned page metadata without inventing totals. Transaction listing requires explicit date bounds at runtime. IDs must be positive safe integers. Exact lookup references and returned IDs are checked. Destination branch codes and provider-required international metadata can be supplied to transfers; requirements depend on the current destination provider.

Bills use the documented category-specific biller route and `customer_id` payload. The legacy `type` is descriptive; only one-time payment is supported. API envelope success establishes request/retrieval success, not completed delivery. Reusable payment-card credentials are omitted from outputs. Optional provider nulls and documented numeric amount strings are normalized without converting account numbers or references.

Bill readback exposes a string prepaid-utility redemption token from the documented `extra` field as optional `rechargeToken`. It is the purchased product's redemption code, distinct from authentication or reusable card credentials; absent or non-string `extra` values are omitted.

The current bill API supports Nigerian billers only. Its separate customer-validation API is recommended for cable and utilities but is not exposed by this surface; callers must supply the confirmed customer identifier. The provider does not require validation for airtime/data, or a validation token in the payment payload.

No charge collection, checkout generation, payout subaccount, dispute, BVN lookup, webhook registration or trigger is advertised by this package. No undocumented account-profile endpoint is fabricated. Private test scenarios use exact account binding from a controlled test transaction and refuse live keys. Financial histories and implicit payout beneficiaries can be retained; cancellation/expiry never implies refunds or data deletion.

Official references: [v3 authentication](https://developer.flutterwave.com/docs/authentication), [v4 authentication](https://developer.flutterwave.com/v4.0.0/docs/authentication), [API index](https://developer.flutterwave.com/llms.txt), [testing](https://developer.flutterwave.com/docs/testing), [bill payments](https://developer.flutterwave.com/docs/bill-payment), [virtual accounts](https://developer.flutterwave.com/docs/ngn-virtual-accounts).
