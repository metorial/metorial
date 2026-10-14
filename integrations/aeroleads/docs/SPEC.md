# AeroLeads Integration Specification

## Authentication

Use an API key from [AeroLeads account settings](https://aeroleads.com/users/settings#api_key). Requests send it as the `api_key` query parameter. No OAuth scopes or additional configuration are required.

## Tools

### `lookup_linkedin_profile`

Look up a prospect using `linkedinUrl`. Calls `GET /api/get_linkedin_details` with the `linkedin_url` query parameter. Returns available names, job and company details, company URLs, location, emails, phone numbers, education, and skills. Profile fields documented as strings are preserved alongside array responses. Returned contact details are not independently verified by this tool.

### `find_email`

Find a business email using `firstName`, `lastName`, and `companyDomain`. Calls `GET /api/get_company_email` with `first_name`, `last_name`, and `company`. Returns the email, prospect name, company domain, and email validity status when provided. Confidence is returned only when the provider supplies a finite numeric value.

## Credits and errors

Lookups may consume AeroLeads account credits. The provider documents HTTP 401 for an invalid API key and HTTP 402 when the credit limit is reached. Empty required inputs are rejected before making a lookup. API keys echoed in response query fields are redacted from returned results.

## API coverage and limitations

The [official API guide](https://aeroleads.com/api) documents the two endpoints above. Its email section describes name-and-company lookup in the request URL but shows email-only examples and verification response fields. The integration retains its existing name-and-company inputs and exposes available response status without assuming an additional verification endpoint.

The reviewed guide does not document a suitable account identity, credit balance, list-management, or webhook endpoint. No additional tools or triggers are inferred from dashboard features. Live provider behavior has not been verified for this refresh.
