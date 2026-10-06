# Lexoffice integration specification

The package retains its 15 original public action keys and adds get_resource, download_document and list_reference_data. Legacy triggers have been removed; no replacement triggers or subscriptions are registered.

## API and authentication

Requests use the current https://api.lexware.io/v1 gateway, Bearer authentication, a bounded timeout and no redirects. API keys are created in the Lexware Office public API settings with selected permissions. Read get_profile to discover organization identity, connection identity and available capabilities.

The oauth and api_key authentication keys and stored token/refreshToken/expiresAt fields remain compatible. Partner OAuth still uses the inherited app.lexoffice.de authorization and token URLs. Current public documentation does not specify these endpoints; preservation is not evidence that new partner flows work. OAuth responses and refresh tokens are validated, omitted refresh tokens retain the previous token and no undocumented expiry is invented.

## Supported operations

| Area | Tools | Behavior |
| --- | --- | --- |
| Contacts | create_contact, get_contact, update_contact, list_contacts | Exclusive company/person, actual roles, bounded lists and versioned full replacement. No API deletion. |
| Sales | create_invoice, get_invoice, create_quotation, create_credit_note, create_order_confirmation | Draft/default or explicit immediate finalization. Required document-specific fields are checked before writes. |
| Articles | manage_article, list_articles | Current PRODUCT/SERVICE and NET/GROSS wire enums; legacy lower-case inputs and price alias remain. Versioned merge updates and independently confirmed deletion. |
| Bookkeeping | manage_voucher, list_vouchers, get_payment | Current taxRatePercent wire field, preserved files and unchanged fields, guarded status transitions and exact payment decimals. |
| Discovery | get_profile, get_resource, list_reference_data | Actual profile and exact known resource types; reference IDs from current provider lists. |
| Files | download_document | Stable authenticated finalized document endpoint. PDF for four sales resource types; XML only for invoice/credit-note XRechnung. |

get_resource supports contact, invoice, quotation, credit_note, order_confirmation, article and voucher. It returns structured known provider fields; it does not expose an arbitrary endpoint or opaque response dump.

Lists expose currentPage, first, last, nextPage and provider totals. The 10,000-result window may require narrower filters even when the last searchable page is reached. Required voucherlist filters accept explicit any.

## Compatibility and failure semantics

Original input properties, optional/required status and enums remain. Unsupported read-only or endpoint-specific properties fail explicitly rather than disappearing. New optional page size, expectedVersion and useCollectiveContact inputs unlock existing documented capabilities. Existing optional profile output fields that the endpoint does not supply remain absent.

Mutations return actual action-result IDs, dates and versions. Failures preserve only safe status and unconfirmed-outcome metadata; raw credentials, transport configuration and response bodies are not retained. There is no automatic mutation retry or invented idempotency contract.

Voucher PUT sends the current version and exact existing files array because omitted files can be permanently deleted. Only unchecked-to-open status changes are supported; an unchecked voucher cannot otherwise be updated. Creation supports open or unchecked status and requires either contactId or explicitly selected collective contact. Existing optional fields are preserved on merge updates. Contact PUT remains a full replacement and refuses existing multi-entry contacts that the public API cannot update safely. XRechnung buyer references and vendor numbers are typed, discoverable and preserved when omitted from an update; explicit objects replace these settings.

Contact name and voucher-number filters receive the documented HTML encoding before normal query encoding. Article filters retain ordinary text. Contact and sales country validation accepts provider-specific tax-region codes. Date-only inputs become UTC midnight and timestamps retain their timezone with exactly three millisecond digits; impossible clock values fail before writes.

Financial values retain their documented precision: totals and bookkeeping amounts up to two decimal places, sales quantities and unit prices up to four. Unsafe numeric values fail; no value is rounded. get_payment exposes an exact decimal companion and actual provider status, including balanced amounts for voided vouchers.

## Private verification

The active private suite covers all 18 keys. It verifies dedicated synthetic account identity, independent GET results, pagination, reference IDs, file digests, invalid-input paths, owned article cleanup and explicitly retained contact history. Financial document creation/finalization and bookkeeping mutations are explicitly disabled. Missing local credentials alone does not skip the suite. No provider operation is performed during static collection or offline checks.

## Official sources

- https://developers.lexware.io/docs/
- https://developers.lexware.io/cookbooks/public-api/
- https://developers.lexware.io/cookbooks/invoices/
- https://developers.lexware.io/cookbooks/bookkeeping/
- https://help.lexware.de/de-form/articles/548863-alles-rund-um-public-api
- https://help.lexware.de/de-form/articles/548348-erneuerung-der-autorisierung
