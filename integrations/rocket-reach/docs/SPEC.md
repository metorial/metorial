# RocketReach API coverage

Reviewed October 5, 2026. This package preserves six API-key REST tools. Base origin: `https://api.rocketreach.co`; prefix: `/api/v2`; authentication: `Api-Key` header. The separate provider MCP service uses OAuth and is not this REST connection.

| Tool | Request | Effect |
| --- | --- | --- |
| `get_account` | `GET /account` | Read account identity, supplied credit/rate data; omit credential fields |
| `search_people` | `POST /search` | Preview people with array-valued query filters |
| `lookup_person` | `GET /person/lookup` | Enrich one identified person, possibly spend credits and retain history |
| `check_lookup_status` | `GET /person/checkStatus?ids=ID&ids=ID` | Read already-requested lookup results |
| `search_companies` | `POST /searchCompany` | Preview companies |
| `lookup_company` | `GET /company/lookup` | Enrich a company; Company Export access and charges may apply |

The official Python SDK confirms the account and person routes, 1-based search offsets, `page_size`, array-valued query filters, `profiles`, `pagination.next`, repeated `ids` parameters, asynchronous enrichment and HTTP 429 handling. The official September 2026 MCP plugin confirms people/company preview and enrichment workflows, free preview searches, company-export prerequisites and varied credit types. It is not an HTTP specification: company routes retain the existing implementation because no accessible current primary source establishes a replacement. All provider responses are validated before mapping; absent fields are not invented. Person search IDs may be absent, so keep other supplied identifiers.

`start` accepts integer values from 1 to 10000 and `pageSize` from 1 to 100. These are runtime validations while the original public number schemas remain unchanged. Returned pagination fields come from the provider, including `nextStart`. A missing continuation is unknown; null or zero indicates no next page. Keep the same filters across pages.

Person enrichment accepts a profile ID, LinkedIn URL, email, or name plus employer. Unknown status strings remain forward compatible. Only `complete` means completion; pending/queued/waiting/searching/progress require status-only polling. Failed or unfamiliar states are never silently completed. No automatic enrichment retry occurs. Default external account webhooks may be configured outside this package; verify their effects before enrichment.

Account responses can contain API keys; only explicitly mapped identity and usage fields are returned. HTTP failures preserve a safe status without returning provider bodies, request headers or credential-bearing causes. Redirects are rejected, timeouts are bounded, and credentials stay in the authentication header.

## Primary evidence and limits

- [Official Python SDK](https://github.com/rocketreach/rocketreach_python), current `main` reviewed October 5, 2026; [published SDK 2.1.8](https://pypi.org/project/rocketreach/), released March 26, 2025.
- [Person gateway](https://github.com/rocketreach/rocketreach_python/blob/main/rocketreach/person_gateway.py), [search paginator](https://github.com/rocketreach/rocketreach_python/blob/main/rocketreach/person_search.py), [API-key gateway](https://github.com/rocketreach/rocketreach_python/blob/main/rocketreach/gateway.py), [account model](https://github.com/rocketreach/rocketreach_python/blob/main/rocketreach/account.py).
- [Official MCP plugin](https://github.com/rocketreach/rocketreach-mcp-plugin), [preview search guidance](https://github.com/rocketreach/rocketreach-mcp-plugin/blob/main/skills/build-list/SKILL.md), [person enrichment](https://github.com/rocketreach/rocketreach-mcp-plugin/blob/main/skills/enrich-person/SKILL.md), [company enrichment](https://github.com/rocketreach/rocketreach-mcp-plugin/blob/main/skills/enrich-company/SKILL.md).

The documentation website could not be opened by the web tool and browser security policy blocked the site. No bypass was attempted. New Universal Credits HTTP contracts, exact company-route currentness, current rate thresholds and plan-specific billing have not been verified against that reference. There is no provider-retirement claim. The existing six tools are retained; unverified API families, bulk operations and credential administration are outside this refresh.
