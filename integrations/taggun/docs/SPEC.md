Now let me check the Taggun API reference for more details on features and input methods.Now I have enough information to write the specification.

# Slates Specification for Taggun

## Overview

Taggun is a receipt and invoice OCR API that extracts structured data from receipt and invoice images using machine learning. It supports multi-language and multi-region receipt processing, fraud detection, and purchase validation for use cases like expense management, loyalty campaigns, and accounting automation.

## Authentication

Taggun uses API key authentication. Users create a Taggun account at taggun.io/sign-up, and after signing in, an API key is sent to the registered email inbox.

The API key must be passed as a custom HTTP header named `apikey` with every request:

```
apikey: YOUR_API_KEY
```

The base URL for all API calls is `https://api.taggun.io`.

There are no OAuth flows, scopes, or additional credentials required. Taggun uses API keys for authentication as the sole method.

## Features

### Receipt and Invoice Data Extraction

Extract key information from receipt and invoice images, including total amount, tax amount, date of purchase, merchant information, and line item amounts. Documents can be submitted as file uploads (JPG, PNG, PDF, GIF, HEIF), base64-encoded content, or via URL. Supported formats include PDF, JPG, PNG, GIF, and HEIF.

- Two response detail levels are available: **simple** (core fields only) and **verbose** (includes line items, invoice/receipt numbers, discount amounts, and additional metadata).
- Each extracted field includes a confidence score indicating extraction accuracy.
- Taggun automatically detects the language of any receipt or invoice.
- An `incognito` mode can be enabled to prevent receipt data from being stored.
- A `refresh` parameter can force re-processing of a previously submitted receipt.

### Fraud Detection

The fraud detection suite can identify duplicate receipts, detect tampered receipts, fake digital or AI-generated receipts, and perform similarity checks across submissions.

- **Duplicate and Similarity Check**: Identifies potential duplicate receipts based on previously scanned documents. Returns similarity scores.
- **Digital Tampering Detection**: Detects Photoshop edits, AI-generated receipts, and other digital alterations. Returns a tamper score.
- **Handwritten Receipt Detection**: Flags receipts containing handwritten elements and provides a handwriting score.
- **Digital Receipt Detection**: Identifies whether a receipt is a digital/electronic receipt vs. a physical one.
- Fraud detection is a modular add-on that must be enabled by contacting Taggun.

### Purchase Validation Campaigns

Taggun's Receipt Validation APIs allow running promotions by automatically validating purchases with receipts or invoices, including setting up and managing campaigns for automating promotions, rewards, and warranty programs.

- Campaign rules can define promotional periods, participating merchants, and eligible products.
- Uses Levenshtein Distance of keywords to accurately determine the validity of a receipt for a rebate campaign.
- Campaigns can be created, updated, and managed via the API.
- Requires contacting Taggun to enable this feature.

### Merchant Intelligence

Standardizes and enriches merchant data extracted from receipts.

- **Merchant Name Normalization**: Standardizes merchant names across receipts for consistent reporting.
- Merchant intelligence standardises merchant names and verifies locations for accurate reporting.
- **Location Matching and Verification**: Verifies merchant locations against known data.

### Purchase Categorisation

Classifies purchases by merchant and product for spending insights.

- **Receipt-Level Categorisation**: Categorizes the overall purchase based on merchant type.
- **Product-Level Categorisation**: Categorizes individual line items by product type.

### Tax Intelligence

Extracts tax details like VAT numbers and rates, supporting global tax systems.

- **Multi-Tier Tax**: Handles receipts with multiple tax types and rates.
- **VAT Number Verification**: Validates VAT numbers via VIES for EU receipts.
- Extracts merchant tax IDs and IBAN information where applicable.

### QR Code Extraction

Extracts data from QR codes found on receipts and invoices, enriching the data extraction capabilities of the API.

- Particularly useful for Brazilian fiscal receipts (SEFAZ compliance).
- Currently an opt-in feature requiring contact with Taggun to enable.

### Serial Number Validation

Validates serial numbers and barcodes found on receipts, useful for warranty and return verification workflows.

### SmartValidate

An advanced validation feature that combines OCR extraction with intelligent validation logic, designed for complex campaign validation scenarios.

## Events

The provider does not support events. Taggun is a request-response API where receipt data is extracted synchronously upon submission. There are no webhooks, event subscriptions, or built-in polling mechanisms.
