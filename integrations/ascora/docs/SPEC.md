# Ascora API specification

Ascora manages customers, enquiries, quotes, jobs, invoices and payments for trade businesses. This integration exposes nine tools for customer/job lookup, enquiry submission and accounting synchronisation.

## Authentication

Customer, job and enquiry tools use an API key generated under **Administration → API Settings**. Requests go to `https://api.ascora.com.au` with the `Auth` header. Generating a new key invalidates the previous one.

Invoice/payment tools use Basic Authentication with an Ascora account against the legacy Accounting API at `https://www.ascora.com.au/acct/api`. An API-key connection cannot invoke these legacy tools; connect using the Accounting API authentication method. The current general API guide also documents newer `/Accounting/` endpoints, which are outside the tools implemented here.

## Tools

| Tool | Provider operation | Behaviour |
| --- | --- | --- |
| `list_customers` | `GET /Customers/Customers` | Search customers with optional type, source, assigned-user, role, contact-text and phone filters plus paging. Returns full records and provider page/record totals. |
| `get_customer` | `GET /Customers/Customer/{id}` | Retrieve a customer discovered through `list_customers`, retaining contact details, addresses and custom fields. |
| `list_jobs` | `GET /Jobs/Jobs` | Search by status, job type, assigned user, customer, text and creation dates; optionally include sections/stages. The provider defaults to open jobs, page 1 and 250 records per page. |
| `get_job` | `GET /Jobs/Job/{jobNumber}` | Retrieve full details for a job number discovered through `list_jobs`. |
| `submit_enquiry` | `POST /Enquiry` | Submit optional contact/address/description fields, lead source and custom fields. Returns the original provider response and newly created enquiry ID when supplied. |
| `get_invoices` | `GET /invoicedetails[/{CompanyId}]` | Retrieve invoices not yet sent to accounts, optionally limited to a date and company. Retains existing header and line-item fields. |
| `mark_invoices` | `POST /MarkInvoice` | Send `InvoiceIds` after successfully pushing those invoices to the external accounting system. |
| `get_payments` | `GET /payments` | Retrieve unsent payments linked to invoices already marked as sent. |
| `mark_payments` | `POST /MarkPayment` | Send `PaymentIds` after successfully pushing those payments to the external accounting system. |

Custom-field names must already exist in **Administration → Custom Fields**. Search `count` fields represent records returned in the current page, not all matching records. No event tools are registered.

## Provider references

- [General API guide v1.7](https://www.ascora.com.au/Assets/Guides/AscoraApiGuide.pdf): enquiries pages 4–6, customers pages 7–9, jobs pages 49–52, newer accounting API pages 71–80.
- [Enquiry API](https://www.ascora.com.au/kb/ascora-enquiry-api).
- [Accounting API](https://www.ascora.com.au/kb/ascora-accounting-api).
- [Archived Accounting API endpoint reference](https://support.ascora.com.au/x/uA0g).
