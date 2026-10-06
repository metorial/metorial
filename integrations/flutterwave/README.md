# Flutterwave

Inspect transactions, payouts, refunds and settlements through the supported Flutterwave API v3. Manage payment plans, subscriptions, beneficiaries and virtual accounts; discover bank and bill-product details; submit and inspect bill payments.

Use an API v3 Secret Key. Configure `sandbox` for `FLWSECK_TEST-` test keys and `production` for live `FLWSECK-` keys. Both modes use the documented v3 API host. A mismatched environment/key or an API v4 token is rejected before any request. The retained `oauth_v4` auth option is deprecated and unavailable: v4 uses a separate client-credentials grant and different APIs. Reconnect with an API v3 Secret Key for these tools.

Financial operations may remain pending or have irreversible effects. Inspect exact transaction/transfer/refund references before retrying an uncertain request. Bill submission returns acceptance, not delivery; use `get_bill_payment` with the returned `tx_ref`. Dynamic virtual accounts expire; issuance does not confirm collection. Subscription activation may resume automatic billing. Test-mode receipts can still reach the business email.

For prepaid utility bills, `get_bill_payment` exposes the provider's redemption token as `rechargeToken` when returned. This is the code used to redeem the purchased utility credit; API and reusable payment credentials remain withheld.

Bill payments currently support Nigerian billers (`NG`). Confirm cable and utility customer details before submitting a payment. Flutterwave recommends its separate customer-validation API for this; that optional API is not exposed here. Airtime and data payments do not require that validation.

Legacy input/output keys remain available. Transaction listing requires explicit `from` and `to` dates at invocation. `paymentType` has no documented v3 listing filter and fails with remediation rather than silently ignoring it. Bill `customer` maps to `customer_id`; `type` remains a descriptive label, and unsupported recurring schedules are rejected. Reusable card credentials are withheld from the retained optional `cardToken` field.

## License

Licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
