# Findymail Integration Specification

Find and verify B2B contact details, enrich companies, search employees, and discover leads.

## Authentication

Connect with a Findymail API key from the dashboard's API section. Requests use `Authorization: Bearer <API_KEY>` against `https://app.findymail.com/api`. Connection configuration has no duplicate or required resource IDs.

## Tools

| Tool | API operation |
| --- | --- |
| `find_email` | `POST /search/name` or `POST /search/business-profile` |
| `verify_email` | `POST /verify` |
| `reverse_email_lookup` | `POST /search/reverse-email` |
| `find_phone` | `POST /search/phone` |
| `enrich_company` | `POST /search/company` |
| `search_employees` | `POST /search/employees` |
| `intellimatch_search` | `POST /intellimatch/search` |
| `get_intellimatch_status` | `GET /intellimatch/status?hash=...` |
| `get_intellimatch_results` | `GET /intellimatch/data?hash=...&page=...&per_page=...` |
| `get_contact_lists` | `GET /lists` |
| `list_contacts` | `GET /contacts/get/{listId}` |
| `get_credits` | `GET /credits` |

## Workflows

IntelliMatch returns an export hash. The existing `searchId` output and the additive `hash` output both expose that value. Check status, then retrieve results when it is `success`. Results retain contact details and page metadata. Request subsequent pages through `lastPage`; `perPage` accepts up to 500.

Use `get_contact_lists` to discover string list IDs. `list_contacts` accepts those IDs directly; omitting the ID selects all contacts. The contacts endpoint identifies a list, rather than a single contact. Its response includes `recordsTotal`, `recordsFiltered`, and the number of returned contacts. No undocumented pagination query is sent.

Employee searches accept up to 10 job titles and return at most 5 people. Email verification and email finding use separate credit balances. Credit, subscription, and HTTP failures are reported as service failures, including provider error bodies sent with HTTP 200.

## Compatibility and verification

Existing tool keys and input field types remain available. New output fields are optional. No identity endpoint is documented, so this package does not invent an account identity tool. No triggers are registered.

The current API audit uses the [official Findymail API documentation](https://app.findymail.com/docs/), last updated July 31, 2026. Provider behavior was not verified live during this refresh.
