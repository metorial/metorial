# Finago (24SevenOffice) Integration Spec

## Scope

This package implements a REST-first Finago Office integration. The public brand is Finago, while the REST API, auth, login, and developer surfaces still use 24SevenOffice domains.

## Auth

Auth uses OAuth 2.0 Client Credentials:

- Token endpoint: `https://login.24sevenoffice.com/oauth/token`
- Audience: `https://api.24sevenoffice.com`
- Required auth inputs: `clientId`, `clientSecret`, `organizationId`
- Optional auth/config input: `baseUrl`, defaulting to `https://rest.api.24sevenoffice.com/v1`

Each token is tied to one organization. Multi-organization access requires separate auth connections.

## Initial Tool Surface

- `finago_get_profile`
- `finago_list_accounts`
- `finago_list_reference_data`
- `finago_list_customers`
- `finago_upsert_customer`
- `finago_list_products`
- `finago_upsert_product`
- `finago_list_sales_orders`
- `finago_get_sales_order`
- `finago_create_sales_order`
- `finago_list_transaction_lines`
- `finago_get_account_balances`
- `finago_upload_transaction_file`
- `finago_get_file_upload_status`
- `finago_get_document`

## Notes And Limits

- SOAP is intentionally not implemented in the first release.
- Webhooks are not implemented because no public Finago REST webhook surface was found.
- File uploads use `POST /fileUpload` with only `contentType`, then upload bytes to the returned HTTPS presigned URL with the returned upload method. Tool output intentionally omits the presigned URL after the upload completes.
- The document tool returns downloaded content through Slate attachments only.
- Direct transaction posting and invoice conversion are deferred until live validation is available against an approved non-production organization.
- Live E2E requires approved Finago Developer Admin credentials and a non-production organization.
