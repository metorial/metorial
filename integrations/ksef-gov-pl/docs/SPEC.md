# KSeF integration specification

## Overview

KSeF is Poland's National e-Invoice System for structured invoices. This integration covers invoice metadata search, original XML retrieval, one-at-a-time online FA(3) submission, submission tracking, and XML UPO receipts. It supports the Ministry of Finance's TEST, DEMO, and production KSeF 2.0 environments. TEST is the default.

The [official API reference](https://api-test.ksef.mf.gov.pl/docs/v2/index.html), [authentication guide](https://github.com/CIRFMF/ksef-api/blob/main/uwierzytelnianie.md), [online submission guide](https://github.com/CIRFMF/ksef-api/blob/main/sesja-interaktywna.md), and [session/UPO guide](https://github.com/CIRFMF/ksef-api/blob/main/faktury/sesje/sesja-sprawdzenie-stanu-i-pobranie-upo.md) define the provider behavior. The API may evolve; the current tool contract follows the KSeF 2.0 TEST OpenAPI checked on 23 September 2026.

## Authentication and environment

Supply an existing KSeF token, environment, context type, and context identifier. KSeF documents context types `Nip`, `InternalId`, `NipVatUe`, and `PeppolId`. Authentication exchanges the supplied token for short-lived access and refresh tokens. The integration renews access when possible and starts a fresh authentication when the refresh token expires. `get_connection_status` verifies access through the current-context limits endpoint and reports the configured context rather than claiming to identify an individual user.

`InvoiceRead` is required for invoice search and XML download. Online invoice submission requires `InvoiceWrite` or another permission accepted by KSeF for that endpoint. Session status and receipt endpoints accept the provider's documented session permissions. Missing permission, revoked token, expired token, and context mismatch are provider errors; the connection must be corrected before retrying.

The environment determines where requests go:

| Environment | API base URL |
| --- | --- |
| TEST | `https://api-test.ksef.mf.gov.pl/v2` |
| DEMO | `https://api-demo.ksef.mf.gov.pl/v2` |
| Production | `https://api.ksef.mf.gov.pl/v2` |

TEST and DEMO are for synthetic or preproduction work. Production submissions create real, lasting invoices. These environments have separate credentials and data.

## Invoice search and retrieval

`search_invoices` uses KSeF metadata search. Choose whether the authenticated context is the seller (`Subject1`), buyer (`Subject2`), third party (`Subject3`), or authorized subject (`SubjectAuthorized`). The date range can use issue, invoicing, or permanent-storage time and may span no more than 100 days in UTC. Optional typed filters include KSeF or issuer invoice number, amount, seller NIP, buyer identifier, currencies, invoicing mode, self-invoicing, form type, invoice types, and attachment presence.

Search starts at page zero with ten results in ascending order unless other pagination or sort inputs are supplied. The result includes `hasMore`, `isTruncated`, and `permanentStorageHwmDate`. `hasMore` calls for another page; `isTruncated` means KSeF has reached its technical result cap for those filters, so narrow the date range and restart pagination. For incremental retrieval, KSeF recommends permanent-storage date in ascending order.

`download_invoice` retrieves the original XML using a KSeF number. A newly processed invoice may take additional time to become downloadable. The result is a downloadable XML file with file metadata.

## FA(3) online submission

`submit_invoice` takes one complete FA(3) XML string. It checks UTF-8 encoding, XML well-formedness, the FA(3) document namespace and form declaration, and the current online invoice-size limit. KSeF performs authoritative schema and business validation. The tool opens an online session, submits an encrypted copy of the exact input bytes, and closes the session. It returns `sessionReferenceNumber` and `invoiceReferenceNumber` for follow-up.

KSeF's HTTP acceptance only starts processing. A successful invoice must later have status code `200` and a KSeF number. Pending codes include `100` and `150`; failures include invalid file, semantic validation, permission, attachment, encryption, and session errors. Duplicate code `440` can include the original session reference and KSeF number. Keep those original references when resolving a duplicate.

If the upload times out or its outcome is ambiguous, inspect the known session, invoice hash, and invoice list before submitting another copy. If automatic session closure fails, use `close_session` with the returned session reference and then check status. Session closure begins creation of a collective UPO; it does not itself prove invoice success.

## Sessions and receipts

`list_sessions` lists online submission sessions and uses a continuation token for another page. `get_session_status` returns session state, invoice counts, and generated UPO references. `list_session_invoices` uses a continuation token to show each invoice's reference, hash, processing status, and KSeF number when assigned. `get_invoice_status` focuses on one invoice by `sessionReferenceNumber` and `invoiceReferenceNumber`.

`download_invoice_upo` needs a successfully processed invoice and its session and invoice references. `download_session_upo` needs a generated `upoReferenceNumber` discovered through `get_session_status`. Each provides an XML file and metadata. A receipt may take time to appear after status changes; check processing and try again later if KSeF has not made it available.

## Scope

This release uses existing KSeF tokens and online FA(3) sessions. It does not issue tokens, generate invoice XML, manage certificates or permissions, perform batch or offline submission, generate QR codes, create bulk exports, or register events. The integration has no personal-profile tool because this KSeF flow does not expose a suitable self/profile endpoint; connection status reports the configured taxpayer context and effective limits instead.
