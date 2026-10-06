# YNAB integration

The integration retains its nineteen original tool keys and adds `get_current_user` and `create_payee`. All public budget names and inputs remain compatible while the client uses current `/plans` routes. YNAB explicitly preserves older `/budgets` routes and response keys; no retirement is implied.

| Workflow | Tools |
| --- | --- |
| Identity and budget discovery | get_current_user, list_budgets, get_budget |
| Accounts | list_accounts, create_account |
| Transactions | list_transactions, get_transaction, create_transaction, update_transaction, delete_transaction, import_transactions |
| Scheduling | list_scheduled_transactions, manage_scheduled_transaction (create/get/update/delete) |
| Categories | list_categories, manage_category (create/update/assign), manage_category_group (create/update) |
| Payees | list_payees, create_payee, update_payee |
| Monthly summaries | list_months, get_month |

Authorization-code OAuth exchanges form-encoded requests at `https://app.ynab.com/oauth/token`. Full access omits `scope`; a separate read-only connection requests `read-only`. Personal access tokens and the original OAuth key are retained. Tokens, refresh state, expiry, identity responses, and provider envelopes are validated. HTTP calls have a thirty-second timeout and do not follow redirects. Transport failures retain sanitized status metadata, with remediation for authentication, permissions, resource absence, and rate limits. Mutations are never automatically retried.

All monetary values remain integer milliunits within JavaScript’s safe integer range, including nested split and goal values. Split sums use exact integer arithmetic. UTC dates, month aliases, required action fields, incompatible fields, empty updates, and transaction-filter exclusivity are validated before transport. Unsupported legacy account creation types and goal writes receive explicit remediation.

Documented delta families are budget detail, accounts, categories, payees, transactions, scheduled transactions, and months. Save server knowledge per budget, endpoint, and filters; merge changed records and deletion tombstones. `get_budget.budgetData` contains returned provider records for a full snapshot or delta merge. Category/payee transaction lists may return hybrid split rows with type and parent identifiers and optional sync knowledge. Month transaction lists return detailed rows and required sync knowledge. No cursor pagination is invented. Single-category and category-month reads do not claim delta support.

Transaction creation preserves import identities and verifies save-receipt counts without treating matched IDs as ownership. Splits may be created or added to a non-split transaction; existing split replacement and split-parent amount/date/category changes are unsupported. Scheduled partial updates read fresh details because PUT requires account and date; the tool conservatively refuses existing split schedules to protect their parts. The API documents no scheduled split creation. Deletes require a returned tombstone for the requested ID.

Category writes use `goal_target_date`, never deprecated `goal_target_month`. `goalTarget=null` removes a target. A recurring `goalFrequency` requires a non-null target amount and excludes a target date. Rollover options only apply to ordinary NEED targets. Loan-paired DEBT categories do not accept frequency/date/rollover changes, and internal or credit-card payment categories do not accept frequency/rollover options.

Creating accounts, payees, categories, or groups is retained. Bank import applies to all linked accounts in the selected budget and may change matching/history. Provider record output is not a downloadable export. Legacy triggers are removed.

Official contract: [API guide and changelog](https://api.ynab.com/), [current API reference](https://api.ynab.com/v1), [live OpenAPI v1.87.0](https://api.ynab.com/papi/open_api_spec.yaml). The official SDK schema lagged at v1.85.0 during this refresh; the live schema is authoritative for the newer goal fields.
