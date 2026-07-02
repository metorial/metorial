Let me check the official API documentation for more details on the available endpoints and features.Now let me check if sevdesk has native webhook support or if integrations rely on polling.Now let me check the Make.com documentation for more details on sevdesk's features and whether there's DATEV export support mentioned in the API.I now have enough information to write a comprehensive specification. Based on my research, sevDesk does not offer native webhooks — integration platforms like Pipedream and Make.com use polling-based triggers to detect new resources.

# Slates Specification for Sevdesk

## Overview

sevDesk is a cloud-based accounting platform for SMEs and freelancers, primarily in Germany and Austria. It covers invoicing, expense management, contact management, order management, inventory/parts management, and financial accounting with German GoBD compliance. API access requires the paid "Buchhaltung Pro" plan.

## Authentication

sevDesk uses **API token authentication**. Each sevDesk administrator account has a single API token — a 32-character hexadecimal string.

**How to obtain the token:**
Navigate to **Settings > User** (German: Einstellungen > Benutzer) in the sevDesk web UI at `https://my.sevdesk.de`, click on the desired user, and find the API token below the language setting. It is recommended to create a dedicated user for API access.

**How to use the token:**
The token must be passed via the `Authorization` header on every request:

```
Authorization: <your-api-token>
```

> **Note:** Previously, tokens could also be passed as a `token` query parameter, but this method has been removed as of April 2025 for security reasons. Only the Authorization header method is supported now.

**Token characteristics:**

- Tokens do not expire; they have an infinite lifetime.
- Tokens are tied to a specific user account. If that user is deleted, the token is permanently lost with no recovery path.

**Base URL:** `https://my.sevdesk.de/api/v1/`

## Features

### Contact Management

Create, read, update, and search contacts (customers, suppliers, etc.). Contacts can be categorized and enriched with addresses, communication ways (email, phone, mobile, fax, website), and accounting-specific information. You can also check customer number availability.

### Invoice Management

Create, retrieve, search, cancel, and delete invoices. Invoices support configurable properties such as invoice date, due date, discount amount, delivery dates, line items (positions), and tax rules. Additional capabilities include:

- Sending invoices via email with the invoice attached as a PDF.
- Rendering and downloading invoice PDFs.
- Marking invoices as sent via a chosen send type.
- Checking partial payment status.
- Booking invoices (recording payments).
- Creating dunning notices, advance invoices, and partial invoices.
- Creating e-invoices (electronic invoices).
- **Consideration:** Invoices in sevDesk system version 2.0 use `taxRule` instead of the older `taxType`/`taxSet` properties. Only specific combinations of tax rules, tax rates, and booking accounts are valid — the Receipt Guidance endpoint helps determine valid combinations.

### Credit Notes

Create and manage credit notes linked to invoices. Credit notes follow similar tax rule constraints as invoices.

### Voucher Management

Create, update, retrieve, search, and book vouchers (incoming invoices/receipts). Voucher positions can be managed individually. Files (e.g., scanned receipts) can be uploaded and attached to vouchers.

- **Consideration:** Vouchers must comply with GoBD requirements. Enshrining a voucher (making it immutable for legal compliance) cannot be undone.

### Order Management

Create, update, retrieve, search, and delete orders. Order positions (line items) can be managed separately. Orders follow the same tax rule system as invoices and vouchers.

### Parts / Inventory Management

Create, update, retrieve, and search parts (products/services) in the inventory. You can query the current stock amount of a given part.

### Communication Ways

Create, search, and delete communication ways for contacts (e.g., email addresses, phone numbers, websites). Each communication way has a type (private, work, fax, mobile, newsletter, invoice address, etc.).

### Accounting Contacts

Create accounting-specific contact records that store financial information like debitor/creditor numbers for bookkeeping purposes.

### DATEV Export

Export accounting data in DATEV format for transfer to tax advisors or external accounting systems. Dedicated API endpoints exist for generating these exports.

### Receipt Guidance

Query which booking accounts, tax rules, and tax rates are compatible with each other, based on client settings (e.g., whether the business is a "Kleinunternehmer" under §19 UStG). This is essential for creating compliant vouchers, invoices, and credit notes.

## Events

The provider does not support events. sevDesk does not offer native webhooks or a purpose-built event subscription mechanism through its API.
