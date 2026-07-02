# <img src="logo.svg" height="20"> SAP S/4HANA

Connect to SAP S/4HANA Cloud or compatible private/on-premise OData APIs for tenant-configured ERP read workflows. This integration reads business partners, sales orders, billing documents, products/materials, purchase orders, and supplier invoices from a configured tenant or the SAP Business Accelerator Hub sandbox.

## Authentication

Configure `baseUrl` in Slate config with the SAP tenant root URL, or use `https://sandbox.api.sap.com/s4hanacloud` for SAP API Hub sandbox calls. Optional config fields include `sapClient`, default company/sales/purchasing organization values, and `sandboxMode`.

Use custom auth with one of these modes:

- `basic`: SAP communication user and password.
- `bearer`: pre-issued SAP bearer/access token.
- `apiHubKey`: SAP Business Accelerator Hub API key for sandbox access.

SAP S/4HANA access depends on enabled Communication Management scenarios, tenant host, tenant edition, and customer security policy. Client certificate authentication and write/posting flows are intentionally not exposed in this initial package.

## Tools

### List Business Partners / Get Business Partner

Read business partners from `API_BUSINESS_PARTNER`, including customer/supplier identity, roles, addresses, tax metadata, and bank metadata where the tenant authorizes those expansions.

### List Sales Orders / Get Sales Order

Read sales order headers from `API_SALES_ORDER_SRV`, with optional item and partner expansion for order-to-cash discovery.

### List Billing Documents / Get Billing Document

Read billing documents from `API_BILLING_DOCUMENT_SRV`, with optional billing item expansion for invoice lookup and reconciliation workflows.

### List Products / Get Product

Read product/material master data from `API_PRODUCT_SRV`, including descriptions, plant metadata, and sales metadata where available.

### List Purchase Orders / Get Purchase Order

Read purchase order headers from `API_PURCHASEORDER_PROCESS_SRV`, with optional item expansion for procure-to-pay visibility.

### List Supplier Invoices / Get Supplier Invoice

Read supplier invoices from `API_SUPPLIERINVOICE_PROCESS_SRV`. `get_supplier_invoice` requires both `supplierInvoice` and `fiscalYear`, matching the SAP key.

## Deferred Tools

Journal entry posting, sales order creation, attachment download, and event/webhook support are deferred until a customer non-production tenant, communication scenarios, and reversal/cleanup strategy are confirmed.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
