# PowerOffice Integration Specification

## Overview

PowerOffice is a Norwegian cloud accounting and ERP platform. This Slates integration targets PowerOffice REST v2 APIs for accounting-first workflows: client integration diagnostics, accounting/sales reference data, dimensional lookups, customer/supplier/product master data, sales order drafts and lifecycle operations, outgoing and incoming invoice reporting, customer/supplier ledger reconciliation, account transactions, trial balance, voucher documentation downloads, and guarded journal-entry voucher approval workflows.

## Authentication

The integration uses PowerOffice OAuth 2.0 Client Credentials Grant. Users provide:

- `environment`: `demo` or `production`
- `appKey`
- `clientKey`
- `subscriptionKey`

The token exchange uses HTTP Basic auth with `appKey:clientKey` and sends `Ocp-Apim-Subscription-Key`. API calls send `Authorization: Bearer <token>` plus the same subscription key. PowerOffice v2 access tokens are short-lived, so the auth method exposes `expiresAt` and refresh handling.

## Implemented Tools

- `poweroffice_get_client_integration_info`
- `poweroffice_list_general_ledger_accounts`
- `poweroffice_list_vat_codes`
- `poweroffice_list_sales_settings`
- `poweroffice_list_financial_settings`
- `poweroffice_list_projects`
- `poweroffice_list_departments`
- `poweroffice_list_locations`
- `poweroffice_list_custom_dimensions`
- `poweroffice_list_customers`
- `poweroffice_upsert_customer`
- `poweroffice_list_suppliers`
- `poweroffice_upsert_supplier`
- `poweroffice_list_products`
- `poweroffice_upsert_product`
- `poweroffice_list_sales_orders`
- `poweroffice_get_sales_order`
- `poweroffice_create_sales_order`
- `poweroffice_get_sales_order_lines`
- `poweroffice_manage_sales_order_line`
- `poweroffice_send_sales_order_invoice`
- `poweroffice_get_sales_order_sent_state`
- `poweroffice_list_sales_order_attachments`
- `poweroffice_download_sales_order_attachment`
- `poweroffice_list_outgoing_invoices`
- `poweroffice_get_outgoing_invoice`
- `poweroffice_get_outgoing_invoice_lines`
- `poweroffice_list_incoming_invoices`
- `poweroffice_get_incoming_invoice`
- `poweroffice_list_account_transactions`
- `poweroffice_list_customer_ledger`
- `poweroffice_list_supplier_ledger`
- `poweroffice_get_trial_balance`
- `poweroffice_download_voucher_documentation`
- `poweroffice_list_journal_entry_vouchers`
- `poweroffice_create_supplier_invoice_voucher_draft`
- `poweroffice_upload_journal_entry_voucher_page`
- `poweroffice_submit_journal_entry_voucher_for_approval`
- `poweroffice_list_voucher_approval_queue`
- `poweroffice_update_voucher_approval`

## Design Notes

- List tools expose PowerOffice `PageNumber`, `PageSize`, `Fields`, `OrderBy`, and relevant endpoint filters.
- Customer and product updates build JSON Patch operations from normal tool fields.
- Sales order invoice sending supports `dryRun` because the upstream action can deliver customer-facing invoices.
- Voucher and sales order attachment downloads return Slate attachments and keep JSON output limited to metadata.
- Supplier invoice journal entry voucher tools create drafts and submit to approval workflows. Direct `/Vouchers/*` posting remains intentionally excluded because it is a sensitive write surface requiring explicit PowerOffice approval.

## Verification

Package-level schema regression coverage uses `describeMcpCompatibleToolSchemas` to ensure tool input schemas remain compatible with MCP/OpenAI tool bridges.
