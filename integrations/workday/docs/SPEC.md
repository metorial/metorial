# Workday integration specification

This package exposes nineteen tools: the original sixteen contracts and three bounded identity, exact-read and prerequisite-discovery tools. It uses tenant REST services and Report-as-a-Service; it does not provide SOAP, recruiting administration, payroll administration or broad employee lifecycle management.

## Authentication and binding

OAuth state records the access token and optional refresh token/expiry together with the REST origin, tenant and authorization URL. The service and authorization origins are distinct provider-issued values from View API Clients. New connections require the complete tenant authorization URL; historical connections can use their original service configuration until reconnection. HTTPS hosts are restricted to `workday.com` and `myworkday.com` subdomains. Token exchanges use `/ccx/oauth2/{tenant}/token` on the service origin; redirects are disabled. Refresh preserves an omitted refresh token and rejects changed account binding.

The five declared functional areas are Staffing, Tenant Non-Configurable, Time Off and Leave, Time Tracking and System. Domain security policies still control each resource. `get_current_user` requests Common's worker-summary view for `me` and returns only the worker ID/display name. Service accounts without a worker receive actionable failure; no worker identity is inferred from a list.

## Service coverage

| Service | Tool coverage and constraints |
| --- | --- |
| Common v1 | Workers, supervisory organizations and worker inbox tasks. Approval uses the exact pending Approval step and connected worker, then checks the returned task identity. Acceptance and overall business-process completion are separate outcomes. |
| Absence Management v5 | Worker `timeOffDetails`, eligible absence types and valid dates. Requests submit `jsonDataBlob` multipart data with a single day and the documented initiation action. Quantity units come from discovery; approval is not claimed. |
| Time Tracking v6 | Worker time-block list using the native worker query and exact time-block reads. |
| WQL v1 | Data sources/fields and query execution. GET is used below 2,048 characters; POST covers 2,048–16,000 characters. The current POST schema does not declare external page arguments; use query LIMIT/OFFSET. Responses require native data/total instead of fabricated empty results. |
| Custom Object Data multi-instance v2 | Worker-scoped complete collection and exact compound-reference reads. Creation checks absence, performs POST and verifies the native OK receipt and exact readback. Update uses current OpenAPI PUT and checks supplied values plus worker binding. Delete requires an existing exact record and native OK receipt. Types without reference IDs receive explicit remediation. |
| Report-as-a-Service | URL-encoded tenant/owner/report identifiers and validated prompt parameters. JSON remains structured data; CSV is a downloadable file with authorized delivery. |

All list responses retain native identifiers and integer totals; page size is 1–100 and offsets are nonnegative integers. Custom-object collection paging is applied locally only after the native complete collection is proved. File output does not place CSV bytes inline in structured report data.

## Current official sources and limits

- [Common worker documentation](https://developer.workday.com/doc/dan1370797991225.md) and [inbox actions](https://developer.workday.com/doc/dan1370797988967.md).
- [Current REST directory](https://developer.workday.com/rest-api-explorer) and [service index](https://developer.workday.com/bundles/rest-directory-ui/public/static/services_oas3.json), including the September 12, 2026 schemas.
- [Multi-instance custom-object guide](https://developer.workday.com/doc/izr1621310982493.md). Its older PATCH wording conflicts with current v2 OpenAPI PUT; this package follows the current schema.
- [WQL administration guide](https://doc.workday.com/admin-guide/en-us/reporting-and-analytics/custom-reports-and-analytics/workday-query-language-wql-/srr1614364076622.html).
- [Tenant API-client endpoint example](https://doc.workday.com/admin-guide/en-us/workday-data-cloud/data-out/workday-live-data-query-/set-up-live-data-query-using-python.html).

The public WQL POST response schema is less complete than its description; malformed or unsupported native results fail visibly. Public schemas cannot establish tenant security, actual consent, ISU worker availability, configured custom-object references or report permissions. No trigger is registered by this package.
