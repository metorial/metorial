# <img src="https://provider-logos.metorial-cdn.com/finago.svg" height="20"> Finago (24SevenOffice)

Manage Finago Office accounting and ERP workflows through the 24SevenOffice REST API. The integration supports organization/profile context, chart of accounts, reference data, customers, products, sales orders, transaction lines, account balances, and accounting document upload/download metadata.

## Authentication

Use Client Credentials auth with a Finago OAuth2 Application ID / Client ID, Client Secret, and Organization ID. Finago issues access tokens per organization using `POST https://login.24sevenoffice.com/oauth/token` with the `login_organization` field.

## Tools

### Get Profile

Reads `/me` and `/organization/information`, with optional identifiers, licenses, license organization, organization people, and documented query filters.

### List Accounts

Lists chart-of-accounts records and can search by account name or number.

### List Reference Data

Reads supporting data such as tax codes, currencies, payment methods, transaction types, fiscal periods, product categories, product units, price lists, sales types, and dimensions.

### List Customers / Upsert Customer

Lists, creates, and updates company or person customers, including supplier flags, addresses, contact email fields, phone numbers, and external references. Company creation requires `isCompany=true` with `name`; person creation requires `isCompany=false` with `firstName` and `lastName`. Customer updates use Finago PATCH fields and cannot change the customer type.

### List Products / Upsert Product

Lists, creates, and updates products with category, unit, supplier, pricing, stock, article-number, supplier-product, and documented nullable clear fields.

### List Sales Orders / Get Sales Order / Create Sales Order

Reads sales orders, optionally includes lines and attachment metadata, and creates draft sales orders with lines.

### List Transaction Lines / Get Account Balances

Reads ledger transaction lines and account balances for reporting workflows.

### Upload Transaction File / Get File Upload Status / Get Document

Uploads transaction files by initiating `POST /fileUpload` with the MIME `contentType`, then sending the file bytes to Finago's returned HTTPS presigned URL with the returned upload method. The upload tool returns file metadata without exposing the presigned URL; downloaded document content is returned only as Slate attachments.

## Deferred Write Tools

Invoice conversion and direct ledger posting are intentionally not exposed until they have live validation against an approved non-production Finago organization.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
