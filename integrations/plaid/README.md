# Plaid

Access consented financial data and supported transfer workflows using Plaid's Sandbox or Production API. The integration pins API version `2020-09-14` and provides 25 tools.

Authenticate with the existing `api_credentials` method (`clientId`, `secret`). Select the matching `environment` configuration, which defaults to `sandbox`. Secrets and Item/report tokens must belong to that environment. There is no application-identity discovery endpoint used by this integration; credential configuration alone does not verify product permissions.

| Workflow | Tools |
| --- | --- |
| Accounts and financial data | `get_accounts`, `get_balances`, `get_auth`, `get_identity`, `get_liabilities`, `get_holdings`, `get_investment_transactions` |
| Transaction history | `get_transactions`, `sync_transactions`, `enrich_transactions` |
| Institutions | `search_institutions`, `get_institution` |
| Link and Items | `create_link_token`, `exchange_public_token`, `get_item`, `remove_item` |
| Transfers | `manage_transfer_authorization`, `create_transfer`, `get_transfer`, `list_transfers`, `cancel_transfer` |
| Signal | `evaluate_signal` |
| Asset Reports | `create_asset_report`, `get_asset_report`, `remove_asset_report` |

Transaction sync retrieves one page at a time. Keep the original cursor until every page succeeds and commit only the final cursor. Restart the whole batch from that original cursor after `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION`. An empty initial page can mean data is not ready. Offset-based transaction tools return the actual page count and provider total; transfer lists have no provider total.

Signal creates a retained evaluation and can incur charges. Balance-only rulesets may return no risk scores; null does not mean zero risk. Authorization approval is not transfer creation or settlement, and an approved decision can still carry a rationale requiring review. Use the same authorization to recover an uncertain transfer creation rather than starting another authorization.

Asset Reports are asynchronous. Poll after `PRODUCT_NOT_READY` or use your configured report webhook. `get_asset_report` returns the existing structured report and can additionally provide a downloadable PDF with `format: "pdf"`. Removing an Item stops its access but does not remove existing Asset Reports or Audit Copies; manage those separately. Report removal does not disconnect source Items.

Use only Items, accounts and tokens the user has authorized. Product access and usage charges vary by account. Transfers move money in Production, and cancellation may become unavailable after submission to the network. This integration does not provide income verification, bank statement downloads, recurring transfers, identity matching, ledgers or consumer-report products.

No webhook triggers are registered. Provider webhook URLs remain optional inputs to supported requests.

See the [official API reference](https://plaid.com/docs/api/) and [versioning documentation](https://plaid.com/docs/api/versioning/).

## License

This integration is licensed under [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
