# Rippling API coverage

The 19 retained tools use `https://api.rippling.com/platform/api`. They do not map to the newer `https://rest.ripplingapis.com` API. V2 selection produces a validation error with instructions to select v1 and connect credentials authorized for that API.

| Tools | Documented v1 endpoint |
| --- | --- |
| `list_employees`, `get_employee` | `GET /employees`, `/employees/include_terminated`, `/employees/{employeeId}` |
| `get_company`, `get_current_user` | `GET /companies/current`, `/me` |
| Department, team, location and level lists | `GET /departments`, `/teams`, `/work_locations`, `/levels` |
| `list_custom_fields` | `GET /custom_fields` |
| Group create/read/update/delete (partner OAuth only) | `POST /groups`, `GET`, `PUT`, `DELETE /groups/{groupId}` |
| `list_leave_requests`, `process_leave_request` | `GET /leave_requests`, `POST /leave_requests/{id}/process?action=approve\|decline` |
| `list_leave_types`, `get_leave_balances` | `GET /company_leave_types`, `/leave_balances/{role}` |
| `push_candidate` | `POST /ats_candidates/push_candidate`; v1 partner OAuth only |
| `get_saml_metadata` | `GET /saml/idp_metadata`; SAML-enabled partner OAuth app installation only |

Group requests use `users` and an opaque string `version`. The public `userIds` field retains its name and maps to employee role IDs. `versionToken` preserves the exact concurrency value; numeric versions are returned only when losslessly representable. Partial group updates hydrate omitted fields from the exact resource before sending the documented PUT.

Candidate inputs preserve `firstName`, `lastName`, `title` and `phone` and map to `name`, `jobTitle` and `phoneNumber`. Optional `candidateId` is the caller's ATS identifier. This endpoint is not an idempotency guarantee or an employee creation API.

Leave actions preserve public `APPROVE` and `DECLINE` enum values and send the documented lowercase query values. Processing first verifies the exact pending request and checks the returned transition. Balance values map documented decimal strings in minutes to the existing numeric output, preserving zero and negative balances; unlimited balances may omit amounts.

OAuth uses the app-specific installation authorize URL, Basic client authentication and form encoding at `/api/o/token/`, validates token lifetime and refresh rotation, and completes the documented `/mark_app_installed` acknowledgment. The documented `company` and `employee` scopes are prerequisites, not supersets; field and company-resource scopes are also declared for retained capabilities. Field read scopes include their documented `:read` suffix, alongside `company:read`, `employee:read`, `company:leave_requests:write`, `company:company_leave_types`, app group read/write scopes and `saml:idp_metadata`. Undocumented `employee:startDate` and unrelated OIDC scopes are excluded. Company identity comes from `/companies/current`; SSO scope and endpoint behavior is not mixed into the installation flow. App name belongs only to OAuth input and persisted auth state.

SAML's retained `metadata` output contains filename/MIME metadata and a downloadable XML result instead of inline file contents. Transport errors are converted into bounded actionable errors without retaining raw request/response parents or reflecting personnel data.

No triggers are registered. No payroll, compensation mutation, expanded administration, provisioning, deprovisioning, replacement trigger groups or undocumented reversal tools are added.

Sources: [current v1 reference](https://developer.rippling.com/documentation/base-api/), [installation](https://developer.rippling.com/documentation/developer-portal/v1-guides/installation), [group management](https://developer.rippling.com/documentation/developer-portal/v1-guides/group-management), [new API quickstart](https://developer.rippling.com/documentation/rest-api/essentials/quickstart).
