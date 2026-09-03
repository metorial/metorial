# <img src="logo.svg" height="20"> Companies House

Search and inspect the United Kingdom public company register. The integration is read-only and covers company discovery, officers, disqualifications, filing history and documents, charges, insolvency cases, and people with significant control (PSCs).

## Authentication

1. Register or sign in to a Companies House developer account.
2. [Create an application and an API key](https://developer.company-information.service.gov.uk/how-to-create-an-application), or manage an existing key from the [developer applications page](https://developer.company-information.service.gov.uk/manage-applications).
3. Configure the connection with that API key. Companies House receives it as the username in HTTP Basic authentication with a blank password, as described in the [official authentication guide](https://developer.company-information.service.gov.uk/authentication).

Keep the key secret. Do not commit it to source control or include it in logs.

## Tools

### Company discovery

- `search_companies` — search by company name or number, with optional active-company and legally-equivalent-name restrictions.
- `search_companies_advanced` — filter by name, status, type, subtype, incorporation or dissolution dates, location, and SIC code.
- `get_company_profile` — retrieve a company’s current profile, registered office, accounts dates, confirmation-statement dates, previous names, and links.

### Officers and disqualifications

- `search_officers` — search officers by name.
- `list_company_officers` — list current and resigned officers, with optional register-view ordering and filtering.
- `list_officer_appointments` — list the companies associated with an officer record.
- `search_disqualified_officers` — search natural and corporate disqualified officers by name.
- `get_officer_disqualifications` — retrieve published disqualifications and permissions to act.

### Filings and documents

- `list_filing_history` — list a company’s filings, optionally filtered by filing category.
- `get_filing_history_item` — retrieve one filing and its document identifier when an image is available.
- `get_document_metadata` — inspect document metadata and discover available representations.
- `download_filing_document` — download one representation advertised by the document metadata.

Call `get_document_metadata` before `download_filing_document`, then pass one of its advertised MIME types. Supported types are `application/pdf`, `application/json`, `application/xml`, `application/xhtml+xml`, `application/zip`, and `text/csv`. A downloaded document is limited to 50 MiB.

### Financial distress, security, and ownership

- `list_company_charges` — list registered charges and their status, classifications, secured details, and persons entitled.
- `get_company_charge` — retrieve one charge with its transactions and related register details.
- `get_company_insolvency` — retrieve published insolvency cases, dates, notes, and practitioners.
- `list_company_pscs` — list people and entities with significant control.
- `list_psc_statements` — list significant-control statements.

## Limits and scope

- Companies House permits up to 600 requests in a five-minute period. A `429` response requires waiting for the rate-limit window to reset.
- List and search requests default to 20 items and are capped by this integration at 100 items per page, even where a provider endpoint permits a larger page.
- The tools read the public register only. They do not file or change company information.
- Public-register results can contain personal data, including names, service addresses, nationalities, occupations, and partial dates of birth. Handle, retain, and republish it only when you have a lawful purpose and comply with applicable data-protection and copyright requirements. See [Companies House guidance on using company data](https://www.gov.uk/guidance/companies-house-data-products#using-companies-house-data) and [personal information on the register](https://www.gov.uk/guidance/your-personal-information-on-the-companies-house-register).
- The public-data API has no API-key identity endpoint that identifies the owner of a key, so this connection does not expose an identity/profile tool.
- OAuth-protected filing, discrepancy reporting, streaming feeds, and sandbox test-data generation are outside this integration. It targets the live read-only API hosts. Companies House does not run its Document API in the sandbox, and sandbox searches can return live data; see the [official API testing guide](https://developer.company-information.service.gov.uk/api-testing).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
