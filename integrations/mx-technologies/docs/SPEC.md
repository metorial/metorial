# MX Technologies integration

## API and authentication

The integration uses MX Platform API v20111101, selected with `Accept: application/vnd.mx.api.v1+json`. Requests use HTTP Basic authentication with the Base64 encoding of `client_id:api_key`. Credentials come from the MX Client Dashboard. Development and production use `https://int-api.mx.com` and `https://api.mx.com`, respectively. The environment is configured separately from API credentials and contains no resource identifier.

The API does not document a current authenticated client profile endpoint. Read User reads an end consumer identified by a supplied GUID; it is not a profile for the authenticated API client. The newer Platform API 2026 has different status/response contracts and is not substituted for the supported version.

## Capabilities

| Area | Tools and behavior |
| --- | --- |
| Users | Create, list, read, update, delete. Creating a user requires at least one supplied property. |
| Members | Create, list, read, update, delete; trigger aggregation; read aggregation status. |
| Connection recovery | Discover member credential definitions and MFA challenges, then update credentials or resume with challenge answers. A challenge lookup returns an empty list for the documented HTTP 204 response. |
| Accounts | List by user or member, read account, list account/routing numbers. |
| Transactions | List by user, member, or account with date and page filters; read transaction. Choose one account/member filter per request. |
| Verification | Start account verification, owner identification, balance checks, and extended history; list account owner data once ready. |
| Institutions | Search institutions and read institution details with credential requirements. |
| Investments | List holdings by user/member/account and read one holding. MX numeric-string quantities are converted to the existing numeric summary field; full detail records retain their original values. |
| Statements | Start statement retrieval, list and read metadata, download an authenticated PDF. |
| Enhancement | Submit off-platform transactions for categorization, cleansing, and classification. MX requires a transaction ID and description. |
| Widgets | Request a widget URL; it expires after ten minutes or first use. |
| Insights and categories | List user insights; list user categories or defaults with pagination. |

The tools expose one page at a time. Standard paginated endpoints allow `recordsPerPage` from 10 to 1000; default categories and insights allow 10 to 100. Existing output keys and JSON types are retained. Provider errors and invalid requests produce actionable errors; malformed list envelopes are not reported as empty financial datasets.

Microdeposits, managed-data ingestion, budgets/goals, the separate Reporting API, webhook subscriptions, and administrative functions are outside this package's current capability map.

## Provider references

- [Official OpenAPI contract](https://github.com/mxenabled/openapi/blob/master/openapi/mx_platform_api.yml)
- [Platform API reference](https://docs.mx.com/api-reference/platform-api/v20111101/reference/mx-platform-api)
- [MFA challenge discovery](https://docs.mx.com/api-reference/platform-api/v20111101/reference/list-member-challenges)
- [Statement PDF download](https://docs.mx.com/api-reference/platform-api/v20111101/reference/download-statement-pdf)
