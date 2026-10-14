# Microsoft Clarity integration

Retrieve project analytics and recording samples using a Microsoft Clarity Data Export token. No project identifier is required during connection setup: the token selects the project.

## Authentication

Project admins create tokens in **Settings → Data Export → Generate new API token**. Requests use `Authorization: Bearer <token>`. The provider does not document a token refresh endpoint; replace invalid or expired tokens through project settings.

## Tools

| Tool | Request | Result |
| --- | --- | --- |
| `get_dashboard_insights` | `GET https://www.clarity.ms/export-data/api/v1/project-live-insights` with `numOfDays` and optional dimension1–3 | Metric array, retaining provider strings and numbers. |
| `list_session_recordings` | `POST https://clarity.microsoft.com/mcp/recordings/sample` with UTC start/end, `filters.date`, mapped filters, numeric sort, and sample count | Recording entries and the number returned. |
| `query_analytics_dashboard` | `POST https://clarity.microsoft.com/mcp/dashboard/query` with query and timezone | Complete JSON query response, including diagnostics. |

Recording input field names stay stable. `urls` maps to exact visited-URL filters; `deviceTypes`, `browsers`, `operatingSystems`, `countries`, and `cities` map to the provider's singular filter names. Desktop maps to PC and macOS maps to MacOS. Sorting accepts the documented sort names or numeric strings 0–7. Missing count/sort uses 100/newest first.

The dashboard export allows 1–3 recent days, up to three dimensions, and 1,000 rows without pagination. Its daily project quota is 10 requests. Recording samples have a maximum of 250 entries. The natural-language query should request one analysis and state its time range; timezone defaults to UTC.

Client-side identification, tagging, event instrumentation, consent, and masking require code on the tracked webpage. These tools do not modify that code or those settings. No documented profile or project-discovery API is exposed by the reviewed endpoints.

## Official references

- [Data Export API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api)
- [Microsoft's server README](https://github.com/microsoft/clarity-mcp-server/blob/main/README.md)
- [Official request types](https://github.com/microsoft/clarity-mcp-server/blob/main/src/types.ts)
- [Official HTTP requests](https://github.com/microsoft/clarity-mcp-server/blob/main/src/tools.ts)
- [Official endpoint constants](https://github.com/microsoft/clarity-mcp-server/blob/main/src/constants.ts)
- [Client-side API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api)
