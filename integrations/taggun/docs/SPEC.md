# Slates Specification for Taggun

## Overview

Taggun is a receipt and invoice OCR API. It extracts structured data from receipt
or invoice images, supports validation campaigns for purchase validation, accepts
manually verified feedback for training, and exposes account-level product
category import/export endpoints for purchase categorization.

Official docs used for this implementation:

- Documentation index: https://developers.taggun.io/llms.txt
- API base URL and authentication: https://developers.taggun.io/docs/obtaining-api-key
- Receipt extraction endpoints: https://developers.taggun.io/reference/encoded-file-verbose
- Validation campaign setup: https://developers.taggun.io/docs/definitions-for-create-campaign-settings
- Receipt validation: https://developers.taggun.io/docs/definitions-for-validate-receipts
- Product categories: https://developers.taggun.io/reference/export-product-categories

## Authentication

Taggun uses API key authentication. The API key is sent in the `apikey` request
header. There are no OAuth flows or scopes.

```http
apikey: YOUR_API_KEY
```

## Tools

### Extract Receipt Data

Extract structured receipt or invoice data from either a public HTTPS URL or
base64-encoded file content. The tool supports Taggun's simple and verbose JSON
endpoints:

- `POST /api/receipt/v1/simple/encoded`
- `POST /api/receipt/v1/simple/url`
- `POST /api/receipt/v1/verbose/encoded`
- `POST /api/receipt/v1/verbose/url`

Verbose mode can return line items, raw OCR text, receipt/invoice identifiers,
tax fields, and account-enabled fraud or categorization fields.

### Validate Receipt

Validate a receipt against existing campaign settings. The URL path sends JSON
to `POST /api/validation/v1/campaign/receipt-validation/url`; the base64 input
path sends multipart file content to
`POST /api/validation/v1/campaign/receipt-validation/file`.

Validation supports campaign ID, reference ID, user ID, sub-account ID, language,
incognito storage behavior, IP address, and geographic merchant hints.

### Manage Campaign

Create, retrieve, update, list, and delete campaign settings:

- `GET /api/validation/v1/campaign/settings/list`
- `GET /api/validation/v1/campaign/settings/{campaignId}`
- `POST /api/validation/v1/campaign/settings/create/{campaignId}`
- `PUT /api/validation/v1/campaign/settings/update/{campaignId}`
- `DELETE /api/validation/v1/campaign/settings/delete/{campaignId}`

Campaign settings use Taggun's current nested request shape: `date`,
`merchantNames`, `productCodes`, `productLineItems`, `balanceOwing`,
`fraudDetection`, and `smartValidate`.

### Manage Product Categories

Export or upload product category definitions:

- `GET /api/account/v1/product-categories/export`
- `POST /api/account/v1/product-categories/import`

If Taggun returns file bytes for export, the tool returns them as a Slate
attachment. Upload accepts CSV or TSV content as base64 input.

### Submit Feedback

Submit manually verified field corrections for a previously scanned receipt by
`referenceId`:

- `POST /api/account/v1/feedback`

Supported correction fields are total amount, tax amount, merchant name,
currency code, and date.

## Triggers

Taggun does not document webhook or event subscription APIs. This integration
does not expose triggers.
