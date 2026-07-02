# Fiken Integration Specification

## Overview

Fiken exposes a REST/JSON API at `https://api.fiken.no/api/v2`. A user can grant
access to one or more companies, and company-scoped endpoints use
`companySlug` in the path.

The first implementation focuses on safe accounting workflows with stable API
schemas: company discovery, contacts, invoices and invoice drafts, products,
projects, purchases, sales, accounts, and account balances.

## Authentication

The integration exposes OAuth2 only. Fiken documents personal API tokens for
customers' own internal use, but third-party integrations must use OAuth2.

OAuth token exchange and refresh calls use
`application/x-www-form-urlencoded` bodies and HTTP Basic authentication with
the OAuth app client id and secret. The auth output stores `token`,
`refreshToken`, and `expiresAt`; refresh preserves the previous refresh token
when Fiken does not return a replacement.

## API Behavior

Collection tools use Fiken's `page` and `pageSize` query parameters. Defaults
are `page=0` and `pageSize=25`, and `pageSize` is capped at 100.

The client sends an `X-Request-ID` UUID and serializes requests through a
per-client queue to respect Fiken's one-concurrent-request limit and 4
requests-per-second guidance.

## Tool Surface

- `list_companies`, `get_company`
- `list_contacts`, `get_contact`, `create_contact`
- `list_invoices`, `get_invoice`
- `list_invoice_drafts`, `get_invoice_draft`, `create_invoice_draft`
- `list_products`, `get_product`, `create_product`
- `list_projects`, `get_project`, `create_project`
- `list_purchases`, `get_purchase`
- `list_sales`, `get_sale`
- `list_accounts`, `get_account`
- `list_account_balances`, `get_account_balance`

## Files

This first tool surface does not download Fiken attachment content. Future
download tools must return Slate attachments rather than inline base64 or full
file text.

## Risks

Fiken production API access is a paid module for end users. Some tools may fail
with authorization errors when API access is not enabled for the selected
company. Attachment download URL behavior still needs live verification before
adding file download tools.
