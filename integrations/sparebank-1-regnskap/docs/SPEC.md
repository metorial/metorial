# SpareBank 1 Regnskap Integration Spec

## Source

SpareBank 1 Regnskap is implemented as a branded Unimicro Platform environment. The implementation uses the public Unimicro Platform OAuth and REST API documentation plus environment discovery through `/api/endpoints`.

## Auth

- OAuth 2.0 authorization code with refresh-token support.
- Environment is selected during OAuth setup.
- The integration discovers and stores AppFramework, Identity, and Files endpoints.
- Token refresh preserves an existing refresh token when the provider omits a rotated token.

## Config

- `companyKey` is optional global configuration for company-scoped tools.
- Tool-level `companyKey` overrides config.
- Company-scoped business and report tools require `companyKey` through either config or tool input.
- `download_file` also requires `companyKey` because the file service requires the company key in the download request.

## Tool Surface

Initial release is read-only:

- `list_companies`
- `list_customers`
- `get_customer`
- `list_suppliers`
- `get_supplier`
- `list_customer_invoices`
- `get_customer_invoice`
- `list_supplier_invoices`
- `get_supplier_invoice`
- `list_products`
- `list_accounts`
- `list_projects`
- `get_trial_balance`
- `get_profit_and_loss`
- `get_balance_sheet`
- `download_file`

The tools support Unimicro query options `filter`, `select`, `expand`, `top`, and `skip` where they apply. Outputs expose stable IDs and summary fields while preserving the raw provider record for provider-specific detail.

## Exclusions

Payment execution, payment batches, invoice posting, and supplier invoice payment workflows are excluded from the first release because the research plan identifies those as higher-risk banking-connected actions. Customer/supplier creation and invoice draft creation are also deferred until a SpareBank 1 Regnskap test company is available to validate exact write semantics.

## Live E2E

Private live E2E coverage is wired in `tests/integrations/sparebank-1-regnskap/tools.e2e.ts`. It requires a SpareBank 1 Regnskap profile, `companyKey`, and fixture IDs for representative customer/supplier/invoice/product/account/project/file records.
