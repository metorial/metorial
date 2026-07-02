# Tripletex Integration Specification

## Overview

Tripletex exposes a REST API for accounting and ERP workflows. The API uses
short-lived session tokens with HTTP Basic authentication, response envelopes
with `value` or `values`, date filters in `YYYY-MM-DD` format, and `from`/`count`
pagination.

## Authentication

The integration exposes two separate Tripletex auth methods:

- `consumer_employee_token`: exchanges a consumer token and employee token
  through `POST /token/session/:create`.
- `jwt_refresh_token`: exchanges a Tripletex JWT refresh token through
  `POST /token/session/:createFromRefreshToken`.

Each invocation exchanges credentials for a fresh session token before calling
Tripletex. The selected company is sent as the Basic-auth username, defaulting
to `0`.

## Tool Surface

- `who_am_i`: current session/company/user context and optional accountant
  client companies.
- `list_customers`, `upsert_customer`
- `list_suppliers`, `upsert_supplier`
- `list_contacts`, `upsert_contact`
- `list_employees`
- `list_reference_data`
- `list_products`, `upsert_product`
- `list_invoices`, `create_invoice`, `send_invoice`,
  `register_invoice_payment`, `get_invoice_pdf`
- `list_orders`, `create_order`, `invoice_order`
- `list_supplier_invoices`, `list_supplier_invoices_for_approval`,
  `get_supplier_invoice_pdf`
- `list_vouchers`, `get_voucher_pdf`
- `list_postings_by_date`
- `get_balance_sheet`
- `list_projects`, `upsert_project`
- `list_document_archive`, `get_document_content`
- `manage_webhook_subscription`

## Files

PDF and document download tools return Slate attachments and keep structured
output limited to metadata such as ids, filenames, MIME type, byte length, and
attachment count.

## Risks

Tripletex entitlements and modules vary by account package. Some write tools may
fail unless the employee token has the necessary Tripletex permissions. Webhook
subscription and document archive endpoints are marked beta in the official
OpenAPI description.
