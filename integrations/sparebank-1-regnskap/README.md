# <img src="https://www.sparebank1.no/content/dam/SB1/ikoner/GUI-ikoner/logo-sparebank1.svg" height="20"> SpareBank 1 Regnskap

Query SpareBank 1 Regnskap accounting data through the Unimicro Platform API. This integration treats SpareBank 1 Regnskap as a SpareBank-branded Unimicro environment and starts with read-only ERP workflows.

## Authentication

SpareBank 1 Regnskap uses Unimicro Platform OAuth 2.0 / OpenID Connect. Register a web application through Unimicro partner onboarding, enable authorization-code login with refresh tokens, and add the Slates OAuth callback URL.

Choose the SpareBank 1 Regnskap environment during authentication. The integration discovers each environment's related endpoints from `/api/endpoints` and stores the AppFramework, Identity, and Files URLs for future calls.

## Configuration

Set `companyKey` when most company-scoped tool calls should target the same company. You can also provide `companyKey` per tool call. Use **List Companies** first when an authenticated user has access to multiple companies.

## Tools

### List Companies

List companies available to the authenticated SpareBank 1 Regnskap user.

### List Customers / Get Customer

List customers with Unimicro query filters or fetch a customer by ID. Requires `companyKey` in config or tool input.

### List Suppliers / Get Supplier

List suppliers with Unimicro query filters or fetch a supplier by ID. Requires `companyKey` in config or tool input.

### List Customer Invoices / Get Customer Invoice

List customer invoices and fetch invoice details, including expanded items or customer data when requested. Requires `companyKey` in config or tool input.

### List Supplier Invoices / Get Supplier Invoice

List incoming supplier invoices and fetch one supplier invoice's details. Requires `companyKey` in config or tool input.

### List Products

List product register records with optional filters. Requires `companyKey` in config or tool input.

### List Accounts

List chart-of-account records with account filters. Requires `companyKey` in config or tool input.

### List Projects

List project records with optional filters. Requires `companyKey` in config or tool input.

### Get Trial Balance / Get Profit and Loss / Get Balance Sheet

Retrieve read-only accounting reports from the Unimicro accounts report actions. Requires `companyKey` in config or tool input.

### Download File

Download a file from the environment's file service by storage reference and return it as a Slate attachment.

## Notes

Public research did not show a separate SpareBank 1 accounting API beyond the Unimicro Platform. Payment execution, payment batch sending, invoice posting, and supplier invoice payment actions are intentionally excluded until provider/customer approval and live test coverage confirm the exact operational semantics.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
