# FreeAgent integration

## Authentication

OAuth authorization-code flow with HTTP Basic client authentication, rotating refresh tokens, and JSON API responses. Choose `production` or `sandbox` on the OAuth connection. The environment is persisted alongside the token and reused for refresh, profile lookup, and tools. New setup does not duplicate environment in tool configuration. Existing stored configuration remains a fallback for tool execution when older auth outputs lack environment; reconnect older sandbox connections to establish environment-aware OAuth state.

FreeAgent has no requested OAuth scopes here; resource access follows the user's permission level. The current-user tool identifies the connected account.

## Tools

The integration exposes 40 tools:

- Contacts: list, get, create, update, delete.
- Invoices: list, get, create, update/status transitions, delete, email, PDF download.
- Expenses: list, create, update, delete.
- Projects: list, create, update, delete.
- Timeslips: list, create, update/timer controls, delete.
- Bank accounts and bank transactions: list.
- Supplier bills and estimates: list and create.
- Tasks: list and create.
- Credit notes: list.
- Reporting: Profit & Loss, Balance Sheet, Trial Balance.
- Account discovery: company, users, current user, categories.

List tools accept explicit pagination where exposed. The API defaults to 25 items and supports at most 100 items per page. `list_invoices` accepts `months` with the retained `last_N_months` view.

## Behavior

API errors retain provider response details and status through structured service errors. An empty collection is returned only when the provider actually returns an empty array. A successful update/status transition with no resource body is followed by a GET; failed readback explains that the write was accepted and warns against repeating it automatically.

Invoice transitions and timer actions cannot be combined with field updates. Category nominal codes are converted to the selected environment's category URLs, retaining expense `Mileage`. Existing invoice and estimate item aliases are translated to the documented provider values without changing their public enums.

`create_expense.rebillMode` accepts `cost`, `markup`, or `price`; markup and price require `rebillFactor`. The legacy `rebillType` field and enum remain present but report a corrective error because `Unbilled` and `Billed` are not documented rebilling modes. Expense creation requires a description at invocation time, matching the API contract while preserving the existing optional schema.

`create_estimate` additionally exposes `estimateType` and `status`, and maps comments to notes. Retained fields without a documented write contract (`create_contact.accountBalance`, `create_project.includesVat`, and `create_estimate.paymentTermsInDays`) report corrective errors instead of implying they were saved. Project/task billing periods retain their public enums and reject values other than the documented `hour` or `day`.

Invoice PDF responses contain encoded PDF bytes inside JSON. The download tool decodes and validates that content and provides a downloadable PDF; ordinary tool output contains only file metadata.

## Scope and verification

Company accounting API only. Payroll, tax filing, stock management, bank reconciliation writes, and Practice Dashboard APIs are not advertised as implemented tools. No triggers are registered. Local type, schema, formatting, and bundle checks do not establish live provider acceptance or deployed download delivery.

## Official references

- [OAuth](https://dev.freeagent.com/docs/oauth)
- [API introduction and pagination](https://dev.freeagent.com/docs/introduction)
- [Invoices](https://dev.freeagent.com/docs/invoices)
- [Expenses](https://dev.freeagent.com/docs/expenses)
- [Estimates](https://dev.freeagent.com/docs/estimates)
- [Projects](https://dev.freeagent.com/docs/projects)
- [Users and current profile](https://dev.freeagent.com/docs/users)
