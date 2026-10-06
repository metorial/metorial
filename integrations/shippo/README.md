# Shippo

Compare connected carrier rates, create shipments and shipping labels, and track packages. Validate addresses, prepare customs declarations and orders, discover carrier accounts, manage parcel templates, inspect asynchronous batch/refund/manifest status, and download available shipping documents. Label purchases can charge the connected account; carrier eligibility and test-mode restrictions apply.

API tokens and partner OAuth connections use Shippo API version `2018-02-08`. The shipping-context tool validates access and reports the authentication mode and known test-token state; it does not claim a verified user identity.

Addresses, shipments, parcels, orders, customs records, transactions and refunds may remain in account history. Batches and manifests are unavailable with test tokens. Pickups must be changed or cancelled through the carrier. Tracking registration uses already configured provider webhooks; this package does not register event listeners.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
