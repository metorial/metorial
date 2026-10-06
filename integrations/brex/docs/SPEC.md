# Brex API coverage

Production uses the current public `api.brex.com` APIs with endpoint-specific versions. Existing former API hosts are still documented as available; this refresh does not claim a provider retirement. Partner staging is a separate non-sandbox environment and is not implemented here.

| Capability | Public tools | Current API |
| --- | --- | --- |
| Identity and users | get_current_user, list_users, manage_user | Team v2; invitation, inactive creation and documented status transitions |
| Cards | list_cards, manage_card | Team v2; vendor controls and explicit lifecycle reasons |
| Expenses and receipts | list_expenses, update_expense, download_expense_receipt | Consolidated v1 reads with CARD filter; current card memo PUT; exact expiring receipt GET files |
| Vendors and transfers | list_vendors, manage_vendor, list_transfers, create_transfer | Payments vendor v1, transfer listing v2, transfer detail/create v1 |
| Spending controls | list_budgets, manage_budget | Budgets v2 and explicitly selected Spend Limits v2 |
| Transactions and accounts | list_transactions, list_accounts | Transactions v2; card-account array and cash-account envelope |
| Organization discovery | list_departments_locations | Team v2; independent continuations |
| Detail readback | get_resource | Exact documented routes for seven existing resource families |

All fifteen original keys and their input properties/enums remain. Unsupported historical fields are rejected explicitly, and nullable/omitted documented response fields are represented without invented state. Current-user auth uses actual identity and separate read/write consent tiers. File downloads contain no signed URLs in ordinary outputs; download links are renewed from the same expense and receipt identifiers.

No accounting, onboarding/referral, travel, PAN/CVV, statement, receipt-upload, incoming-transfer or webhook capability is claimed. Legacy triggers have been removed without replacement. See the README for runtime compatibility guidance and private verification prerequisites.

Official references: [Team](https://developer.brex.com/_bundle/openapi/team_api.json?download), [Budgets](https://developer.brex.com/_bundle/openapi/budgets_api.json?download), [Expenses](https://developer.brex.com/_bundle/openapi/expenses_api.json?download), [Payments](https://developer.brex.com/_bundle/openapi/payments_api.json?download), [Transactions](https://developer.brex.com/_bundle/openapi/transactions_api.json?download), [developer authentication](https://developer.brex.com/guides/authentication), [partner authentication](https://developer.brex.com/guides/partner_authentication), [roles/scopes](https://developer.brex.com/guides/roles_permissions_scopes), [pagination](https://developer.brex.com/guides/pagination), [idempotency](https://developer.brex.com/guides/idempotency), [errors](https://developer.brex.com/guides/error_codes), [rate limits](https://developer.brex.com/guides/rate_limits), [versioning](https://developer.brex.com/guides/versioning).
