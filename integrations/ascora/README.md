# <img src="logo.png" height="20"> Ascora

Search and retrieve customers and jobs, submit enquiries with contact details and custom fields, and retrieve invoices and payments for accounting synchronisation. Mark invoices and payments as sent after successfully processing them in an external accounting system.

Customer, job and enquiry tools require an API key from **Administration → API Settings**. Invoice and payment sync tools use Basic Authentication with an Ascora account for the legacy Accounting API.

Available tools: `list_customers`, `get_customer`, `list_jobs`, `get_job`, `submit_enquiry`, `get_invoices`, `mark_invoices`, `get_payments`, and `mark_payments`. Customer and job searches support optional filters and paging; their `count` is the number of records returned in the current page.

See the [Ascora API guide](https://www.ascora.com.au/Assets/Guides/AscoraApiGuide.pdf), [Enquiry API](https://www.ascora.com.au/kb/ascora-enquiry-api), and [Accounting API](https://www.ascora.com.au/kb/ascora-accounting-api) for provider contracts.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
