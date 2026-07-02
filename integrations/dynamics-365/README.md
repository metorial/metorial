# Dynamics 365

Unified Microsoft Dynamics 365 connector for Dataverse, Sales, Customer Service,
Field Service, Contact Center, Customer Insights, Finance, Supply Chain, Project
Operations, Commerce, Human Resources, and Business Central.

The provider key is `dynamics-365`. The public tool surface is intentionally new
and explicit: every tool ID starts with its subservice prefix, such as
`dataverse_list_records`, `finance_list_customers`,
`business_central_list_customers`, or `commerce_manage_customers`.

## Authentication

The integration exposes four auth methods:

- `oauth_common`: Work & Personal delegated Microsoft OAuth for configured
  Dataverse, Finance and Operations, and Business Central resources.
- `oauth_organizations`: Work Only delegated Microsoft OAuth for configured
  Dataverse, Finance and Operations, and Business Central resources.
- `microsoft_client_credentials`: app-only tokens for configured Dataverse,
  Finance and Operations, and Commerce Retail Server resources.
- `commerce_access_token`: direct Commerce Retail Server bearer-token setup.

There is no discovery fallback and no legacy auth aliasing. Configure exact
resource fields such as `dataverseInstanceUrl`, `finOpsBaseUrl`,
`businessCentralEnvironmentName`, `retailServerUrl`, and
`commerceServerResourceId` for the resources you want to enable. Business
Central OAuth can use the common Business Central endpoint without
`businessCentralTenantId`; set `businessCentralTenantId` only when you need a
direct-tenant Business Central URL segment. If every OAuth resource input is
left blank during setup, the integration defaults to Business Central
`production`.

## Tool Families

- `dataverse_*`: generic Dataverse records, metadata, search, relationships,
  actions/functions, file columns, batch requests, and Dataverse triggers.
- `sales_*`, `customer_service_*`, `field_service_*`, `contact_center_*`, and
  `customer_insights_*`: Dataverse-backed product workflows and records.
- `finance_*`, `supply_chain_*`, and `human_resources_*`: Finance and Operations
  OData resources and Data Management status checks.
- `project_operations_*`: Project Operations Dataverse records, schedule API
  OperationSets, and Finance handoff status checks.
- `commerce_*`: Commerce Retail Server channels, catalogs, products, customers,
  carts, orders, and metadata.
- `business_central_*`: Business Central companies, customers, vendors,
  invoices, items, accounts, general ledger entries, journals, and document
  attachments.

## File Outputs

Download/export tools return bytes as Slate attachments. Structured output is
limited to metadata such as MIME type, size, ids, and attachment count.

## License

This integration is licensed under the
[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
