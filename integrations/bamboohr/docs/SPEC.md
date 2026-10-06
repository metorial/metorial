# BambooHR API coverage

The 39-tool integration uses the company-owned HTTPS origin and documented API v1 routes, plus v1.1 for preserving optional goal fields during updates. Requests do not follow redirects. API keys use Basic authentication with an arbitrary password; OAuth authorization, token exchange and refresh use the company origin. Refresh requires the connection's saved redirect URI.

The 36 prior tool keys and input/output requiredness are retained. New capabilities are minimal caller identity, bounded resource discovery (employee cursor pages, current report pages and enabled ATS statuses), and exact employee/company file download. Administrative HR, payroll, photo management, notifications and event subscriptions are outside the public scope.

## Provider behavior

- Caller employee ID `0` can be unbound. Employee field visibility and directory sharing are permission-sensitive.
- Current `/custom-reports` IDs and deprecated `/reports` IDs are different namespaces. Current reads are JSON pages; legacy JSON/CSV/PDF/XML export support is retained. Deprecated ad-hoc reporting uses current historical field values, without excluding inactive employees.
- Time-off status updates acknowledge a workflow transition. They do not prove final approval. Whos-out includes holidays; balances are permission-sensitive.
- The documented timesheet endpoint returns hour and clock entries together. Nullable start times distinguish hour entries from clock entries; no undocumented clock-list endpoint is used.
- Goal listing is capped at 50. Creation needs title/dueDate/owner sharing. v1.1 updates preserve omitted optional fields and milestone state.
- Training collections can be keyed objects. The provider uses the `type` query/body key and decimal-string cost amounts.
- Benefits are read-only company summaries and coverage levels, with exact employee-dependent filtering.
- Uploads use multipart file content and category permission checks. Creation receipts require a same-company, exact-scope Location. File deletion requires visible deletion permission and an absence readback.
- ATS status IDs must be visible and enabled. Application paging uses `page` and the provider completion flag; `pageLimit` has no documented contract.
- Transport failures discard upstream response bodies, credentials and raw error parents. Structured responses and decoded export text reject credential echoes.
- Table-row creation/update use the documented v1.1 endpoints. A 200 update can skip fields because of permissions; exact readback produces verified/unverified field lists. Creation does not fabricate a row ID. Deletion requires a positive receipt and subsequent absence.

## Official sources

- [Getting started and authentication](https://documentation.bamboohr.com/docs/getting-started)
- [Current public OpenAPI](https://openapi.bamboohr.io/main/latest/docs/openapi/public-openapi.yaml)
- [Employee reads](https://documentation.bamboohr.com/reference/get-employee)
- [Employee discovery](https://documentation.bamboohr.com/reference/list-employees)
- [Current saved reports](https://documentation.bamboohr.com/reference/list-reports)
- [Legacy saved reports](https://documentation.bamboohr.com/reference/get-company-report)
- [Ad-hoc reports](https://documentation.bamboohr.com/reference/request-custom-report)
