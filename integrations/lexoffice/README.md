# Lexoffice

Connect to Lexware Office for contact and article management, sales documents, bookkeeping voucher details, payments and organization information.

Use an API key generated at https://app.lexware.de/addons/public-api with permissions for the tools you need. The current API gateway is https://api.lexware.io/v1. Public API access depends on the account plan and enabled permissions. The existing partner OAuth connection method is retained for stored connections; its inherited authorization and token URLs are not specified in the public documentation and have not been independently verified.

The integration exposes 18 tools:

- Contacts: create_contact, get_contact, update_contact, list_contacts.
- Sales documents: create_invoice, get_invoice, create_quotation, create_credit_note, create_order_confirmation.
- Articles: manage_article, list_articles.
- Bookkeeping: manage_voucher, list_vouchers, get_payment.
- Discovery and files: get_profile, get_resource, list_reference_data, download_document.

get_resource reads contacts, invoices, quotations, credit notes, order confirmations, articles and bookkeeping vouchers. list_reference_data returns actual posting categories, payment conditions, countries or print layouts. download_document provides finalized PDFs and XRechnung XML for invoices and credit notes. An XRechnung PDF is a preview; its XML is the electronic invoice.

Lists use zero-based pages, accept up to 250 results per page and return actual continuation metadata. Searches have a 10,000-result window; narrow filters when the window is reached. list_vouchers requires voucherType and voucherStatus; explicitly use any to include all available types or statuses.

Article updates preserve omitted fields and use the current resource version. Bookkeeping updates also preserve all existing file IDs; they refuse to run when the provider omits the file list. Optional expectedVersion inputs guard against updating a newer resource. Conflicting or ambiguous writes are never automatically retried.

Contact updates replace the full supported contact representation and may clear omitted fields. Omitted XRechnung settings are preserved; an explicit XRechnung object replaces them. Retrieve the contact first, preserve all required data and supply its version. A buyer reference requires your vendor number at the customer. The API cannot update contacts with multiple entries in an address, email, phone or contact-person list. Customer and vendor numbers are read-only. Contacts cannot be erased through this API.

Search names and voucher numbers use ordinary text, including ampersands and angle brackets. Country codes include provider-specific tax regions such as ES_CN and GR_69; discover the current choices with list_reference_data. Input timestamps are normalized to the provider's required three-digit milliseconds without changing their timezone.

Sales documents require complete priced line items and valid dates. Invoice and order-confirmation creation require explicit shipping conditions; quotation creation requires an expiration date. Currency is EUR. Documents are drafts unless immediate finalization is explicitly requested. Finalized documents and bookkeeping writes can retain accounting history or alter balances, particularly credit notes linked to invoices.

Legacy properties unsupported by the current API remain visible for compatibility and fail with a clear error before a write. These include quotation shipping conditions, paymentTermLabelTemplate for writes and credit-note discounts. Article taxRatePercentage remains a string enum input and is translated to the current numeric taxRate wire field. Legacy article output aliases remain available; get_resource uses provider field names.

Money is never rounded to fit a response. Unsafe numeric values fail validation. get_payment additionally exposes openAmountExact and omits the numeric companion when an exact decimal string exceeds the safe numeric range. A balanced payment amount alone does not prove that a voucher was paid.

Official documentation: https://developers.lexware.io/docs/ and https://developers.lexware.io/cookbooks/public-api/.
