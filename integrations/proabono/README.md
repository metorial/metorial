# ProAbono

Manage customer accounts, subscriptions, feature usage, offers, invoices, billing settings, one-time charges, and pricing previews through the ProAbono Live API.

Connect using the Agent Key, API Key, and HTTPS API endpoint shown under **My Profile > Integration** in ProAbono. The endpoint is instance-specific. An optional default segment can scope customer creation and supported list operations.

| Tool | Capabilities |
| --- | --- |
| `manage_customers` | Create, get, update, list, suspend, anonymize, and revoke portal links |
| `manage_subscriptions` | Create, get, list, start, suspend, upgrade, terminate, and update term dates |
| `get_features` | Discover feature references and localized feature details |
| `manage_usages` | Read, update, and batch-update feature usage |
| `get_offers` | Browse plans and upgrade options, including pricing-table and reference-prefix filters |
| `manage_invoices` | Retrieve invoices, list invoices, and bill an outstanding customer balance |
| `manage_balance` | Add debit/credit lines and list balance movements |
| `manage_customer_settings` | Read/update billing addresses and payment settings |
| `quote_pricing` | Preview creation, upgrade, start, usage, and one-time charge pricing |

Use `manage_subscriptions` with `action=list` to discover numeric subscription IDs. These IDs identify lifecycle operations; a customer reference selects the latest active subscription when an ID is omitted. The Live API does not document subscription-reference lookups.

Usage updates require a customer reference or subscription ID, one of `increment`, `quantityCurrent`, or `isEnabled`, and an ISO 8601 `dateStamp`. Keep the timestamp stable when retrying the same event. Batch updates support at most 50 entries. Usage quotes also accept `dateStamp`.

`isAutoBilling` maps to the provider's `ModeBilling` (`true` → `Auto`, `false` → `Manual`). Use `modeBilling` to select `Never` explicitly. Automated payment details are managed through the hosted customer portal. Invoice outputs retain provider links; encrypted portal/PDF links may expire and should be requested again when needed.

See the [Live API reference](https://doc-api.proabono.com/) and [API key guide](https://docs.proabono.com/en/developer/api-overview/how-to-get-my-api-keys/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
