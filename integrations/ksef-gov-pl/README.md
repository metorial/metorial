# <img src="https://www.gov.pl/photo/format/61aa4a1d-54bf-4db7-9c75-e3b0564d8e36/resolution/1920x810" height="20"> KSeF

Search and download invoices in Poland's National e-Invoice System (KSeF), submit existing FA(3) XML invoices, follow their processing, and download official UPO receipts.

## Connect

Provide an existing KSeF token and the taxpayer context in which it should be used. Choose **TEST**, **DEMO**, or **production**; TEST is the default. The context type may be `Nip`, `InternalId`, `NipVatUe`, or `PeppolId`. The token needs `InvoiceRead` for invoice search and download, and `InvoiceWrite` for online submission and session follow-up. KSeF can also authorize some session operations through other documented permissions.

Use synthetic taxpayer and invoice data in TEST. A production submission creates a real invoice that cannot be deleted. This integration accepts an existing token; token issuance and permission administration are outside its scope.

## Tools

| Tool | Result |
| --- | --- |
| `get_connection_status` | Check access and show the selected environment, taxpayer context, and effective KSeF limits. |
| `search_invoices` | Search invoice metadata by party role, date range, and supported filters. |
| `download_invoice` | Download the original XML for a KSeF number. |
| `submit_invoice` | Send one complete FA(3) XML invoice and return session and invoice tracking references. |
| `list_sessions` | List online submission sessions, with filters and continuation pagination. |
| `get_session_status` | Check a session's processing status, counts, and available UPO references. |
| `list_session_invoices` | List submitted invoices and their hashes, references, and processing results. |
| `get_invoice_status` | Check one submitted invoice by its session and invoice references. |
| `close_session` | Close an online session, including one left open after a failed automatic close. |
| `download_invoice_upo` | Download an accepted invoice's XML receipt. |
| `download_session_upo` | Download a generated session XML receipt using its UPO reference. |

## Typical workflow

Search with a date range of at most 100 days. Search results indicate when another page exists and when KSeF truncated the result set. Narrow the date range when results are truncated. An invoice's KSeF number can then be used to download its original XML.

To send an invoice, pass a complete, well-formed UTF-8 FA(3) XML document to `submit_invoice`. The tool returns tracking references after KSeF accepts the upload for processing. That response does **not** mean the invoice has been issued or assigned a KSeF number. Use `get_invoice_status` or `list_session_invoices` to confirm success, inspect a rejection or duplicate, and obtain the KSeF number. If the upload result is uncertain, inspect the session and invoice hash before sending again.

Use `get_session_status` to discover a generated session UPO reference. Invoice and session UPOs become available after successful processing. The download tools return XML files; they do not insert the XML into their text results.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
