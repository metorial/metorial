# TaxJar API capabilities

| Workflow | Tool keys |
| --- | --- |
| Calculate order tax and inspect rates | `calculate_tax`, `lookup_rates`, `list_summarized_rates` |
| Discover product tax codes and configured nexus | `list_categories`, `list_nexus_regions` |
| Order reporting records | `list_orders`, `get_order`, `create_order`, `update_order`, `delete_order` |
| Refund reporting records | `list_refunds`, `get_refund`, `create_refund`, `update_refund`, `delete_refund` |
| Customer exemption records | `list_customers`, `get_customer`, `create_customer`, `update_customer`, `delete_customer` |
| Standardize supported US addresses | `validate_address` |

Authentication uses a bearer API token and its selected production or sandbox environment. Sandbox requires a separate token. API versions currently supported are 2012-01-01, 2020-08-07 and 2022-01-24. Omit the version to use the account default.

A calculation requires shipping plus an amount or line items. US destinations require ZIP and state. Account settings may provide the origin/nexus information. New order/refund records require a transaction date and an ID containing letters, digits, underscores or dashes. Transaction amount includes shipping and excludes tax; calculation amount excludes shipping. Refund records reference a distinct original order ID. TaxJar signs monetary values; the integration preserves the supplied values. These records affect reporting and filing, rather than customer payments.

Transaction lists accept an exact date or a complete date range, plus an optional provider source. Read/delete selectors default to the API source. The documented endpoints do not expose pagination cursors. Customer listing resolves the returned customer IDs into details. Customer updates preserve omitted required name/exemption fields; refund updates preserve an omitted original-order reference. Customer deletion returns the previous customer details after an acknowledged deletion receipt.

Sandbox transaction responses cannot prove persisted create/update/delete state. Sandbox calculations are formatting evidence, not tax accuracy evidence. Address validation needs Professional access and is unsupported in sandbox; ZIP-only matches can omit a street. The API has no documented current-account identity endpoint. Nexus settings are not identity or legal tax-obligation advice.

Sources: [API reference](https://developers.taxjar.com/api/reference/), [sandbox endpoint support](https://support.taxjar.com/article/677-which-sandbox-endpoints-are-currently-supported).
