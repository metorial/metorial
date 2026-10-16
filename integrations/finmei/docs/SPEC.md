# Finmei integration

## Official sources

The Finmei homepage links to the provider-maintained [Public API reference](https://documenter.getpostman.com/view/835227/2s9YXh5NRs). Its published [Postman collection](https://documenter.gw.postman.com/api/collections/835227/2s9YXh5NRs?versionTag=latest) was reviewed on 2026-10-15. [Product features](https://finmei.com/features) and [pricing](https://finmei.com/pricing) describe API access and webhook availability; they do not specify webhook events, registration, signatures, or callback contracts.

## Connection

Requests use `https://app.finmei.com/api` and Bearer authentication. Generate an API token under Settings → Integrations. Each token accesses one business. There is no OAuth flow, connection configuration, or user-entered business ID. Auth validation and `get_profile` read the business-scoped `data` envelope from `GET /profile`; business ID/title identify both company and individual businesses.

The client applies a 30-second timeout, structured service errors, response-body-aware validation detail extraction, credential scrubbing, encoded resource IDs, and runtime pagination validation. Existing structured service errors retain their identity. HTTP status and provider validation messages remain available. Error parents do not retain the original credential-bearing upstream exception.

## Documented tools

| Tool | API route and behavior |
| --- | --- |
| `create_invoice` | `POST /invoices`; translates invoice date, buyer company/individual identity, seller fields, payment options, and line items to documented field names. Requires type, invoiceDate, series, currency, buyer details, products and units at invocation time; schemas retain previous optionality. |
| `update_invoice` | `PUT /invoices/{id}`; the reference requires the same complete fields as creation. Read the current invoice before replacing it; supply payment options, seller details, notes and other optional fields that must remain. |
| `get_invoice` | `GET /invoices/{id}`; returns ID, invoice number, payment state, total, currency, share link, and unchanged invoice data. |
| `list_invoices` | `GET /invoices`; reads `data` plus `meta.current_page`, `last_page`, and `total`. Maps `invoice_number`, `payment_status`, `invoice_date`, `pay_until_date`, and `total_incl_vat`. The optional amount-due field is populated only from an actual `amount_due` value; a document total is exposed separately. |
| `delete_invoice` | `DELETE /invoices/{id}`; the documented success response has no body. HTTP failure prevents a success result. |
| `download_invoice` | `GET /invoices/{id}/download`; prepares an authenticated downloadable PDF after retrieving the invoice. |
| `manage_expense` create | `POST /expenses`; multipart receipt upload with documented `file`, `date`, `total`, `currency`, and `seller` fields. Existing amount and sellerName inputs map to total and seller. The additive file input carries base64 content, filename, and optional MIME type. |
| `manage_expense` update | `PUT /expenses/{id}`; supplies date, total, currency, and seller. |
| `manage_expense` update_file | `POST /expenses/{id}/file`; replaces only the multipart receipt file. |
| `list_expenses` | `GET /expenses`; maps total and seller, and preserves the provider pagination envelope. |
| `get_expense` | `GET /expenses/{id}`; returns expense ID, total, date, currency, seller and unchanged expense data. |
| `download_expense_file` | `GET /expenses/{id}/download`; prepares the original authenticated PDF/image receipt after retrieving the expense. |
| `get_profile` | `GET /profile`; reads business_id, business_title, business_type and company_name. Raw profile fields retain the individual/company distinctions. |

Invoice creation uses saved seller information by default. Supply custom seller information with useDefaultSellerInfo=false. Buyer type is company or individual; the corresponding company name or first/last names are required by the API. Optional payment instructions support bank and other options. Provider-side validation remains authoritative for conditional VAT rules and business identity.

The list examples use 50 records per page and return pagination metadata. Existing perPage inputs remain available and forwarded, but the reference does not document configurable page size or the prior claimed default/maximum. Runtime page/size/limit values must be positive integers, while offsets must be nonnegative integers.

Download tools return metadata and downloadable files rather than file contents or credentials. Stable authenticated download routes do not need expiring-URL refresh. A successful tool invocation alone does not prove a deployed download can be fetched.

## Retained routes without current detailed contracts

The current official collection contains only invoices, expenses, and profile. The following existing routes and public contracts remain unchanged in purpose; availability, filtering, required fields, and exact response shapes could not be independently confirmed:

| Existing tools | Retained routes |
| --- | --- |
| `list_customers`, `manage_customer` | `GET /customers`, `PUT/DELETE /customers/{id}` |
| `list_products`, `get_product`, `manage_product` | `GET/POST /products`, `GET/PUT/DELETE /products/{id}` |
| `list_payments`, `manage_payment` | `GET/POST /payments`, `GET/DELETE /payments/{id}` |
| `list_currencies` | `GET /currencies` |
| `manage_expense` delete | `DELETE /expenses/{id}` |

No speculative customer, product, payment or currency endpoints were added. Existing legacy description/category expense inputs and buyer city/state/country/postal-code inputs remain forwarded for compatibility, but they are absent from the current reference and acceptance is not confirmed. No claim is made that their presence creates supported provider features. Trigger implementation is deferred because the public sources omit the required webhook contract.

## Output and verification policy

All existing keys, scalar types, enum members, requiredness and raw fields remain. The expense action enum gains update and update_file; new input/output fields are additive and optional on existing tools. Required malformed list/entity/ID responses fail with a structured service error instead of becoming empty lists or invented IDs. Optional typed fields omit provider null or absent values; complete provider data remains in existing raw fields or additive rawResponse fields. No nullable output union was introduced. Provider Unix-second timestamps become ISO strings to preserve the original string output types.

The local refresh runs a filtered package build, package typecheck, scoped Biome check, diff check, and recursive comparison of every existing input/output schema against the saved baseline. It performs no live provider calls, live E2E, evals, invoice mutations, receipt uploads, or download fetches. Runtime acceptance and deployed file delivery remain unverified.
