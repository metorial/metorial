# TalentHR API Integration

Official API reference: [TalentHR API](https://apidocs.talenthr.io/).

## Authentication and API

TalentHR's public API is `https://pubapi.talenthr.io/v1`. Requests require HTTPS and `Accept: application/json`. HTTP Basic authentication uses the API key as username and an ignored password. Generate keys in Settings > Domain > API. Read-only keys permit GET requests; write operations need a full key. The documented per-key rate limit is 2,000 requests per minute, with additional plan usage limits. OAuth, refresh tokens, and connection configuration are not used.

## Tools

| Tools | API routes |
| --- | --- |
| `hire_employee`, `get_employee`, `update_employee` | `POST /employees/hire`, `GET /employees/{id}`, `PUT /employees/{id}` |
| `list_employees` | `GET /directory` |
| `list_organizational_structure` | `GET /departments`, `/divisions`, `/job-titles`, `/locations`, `/employment-statuses` |
| `create_department`, `create_division`, `create_job_title`, `create_location` | Corresponding collection POST |
| `list_time_off_requests`, `respond_time_off_request` | `GET /employees/{id}/time-off-requests`, `POST /employees/{id}/time-off-requests/{requestId}/reply` |
| `get_time_off_budgets` | `GET /employees/{id}/time-off-budgets` |
| `get_calendar` | `GET /calendar` |
| `list_job_positions`, `list_job_applications` | `GET /job-positions`, `/ats-applicants`, `/job-positions/{id}/ats-applicants` |
| `list_reference_data` | `GET /countries`, `/nationalities`, `/relationship-types`, `/languages`, `/time-off-types` |

## Behavior

- Paginated tools fetch one page using limit 1–100 and a nonnegative integer offset. Existing integration defaults remain limit 100 and offset 0; the API defaults to 10 when limit is absent. Counts describe the returned page, and provider totals are separate optional fields.
- Employee IDs retain public string input types and are validated as positive integer IDs before requests. Compensation remains numeric and allows at most two fractional digits.
- Hiring sends a null manager when no manager is supplied, matching the documented head-of-company behavior. When a job record is supplied, unselected job relationships use documented nullable values. Onboarding meeting details must include the meeting employee, address, and time together.
- `update_employee` accepts partial input, but TalentHR PUT requires first name, last name, and email. Missing required values are fetched from the existing employee profile. An unavailable or malformed profile stops the update; the tool does not invent identity values. A concurrent profile edit between read and write remains possible.
- `create_location` requires address and remote status at runtime while preserving existing input optionalness. Missing values raise an actionable validation error before a request.
- Time-off requests expose provider approval and cancellation flags. The legacy `status` string is included only if returned; it is not synthesized. Job-specific applicant results may omit update time and application count, so those legacy fields are included only when present. The provider's nested application details remain available.
- Full provider responses are preserved. Budget decimal strings remain strings. No downloadable file tools or native triggers are registered. No suitable current-user/account identity endpoint is documented in the reviewed API collection.

## Verification boundary

The October 2026 refresh used public documentation, builds, schema checks, and offline fixtures only. It did not call TalentHR account endpoints, verify plan-specific features, register callbacks, or exercise live HR data. Optional custom-field administration, payroll/bonus records, asset management, and ATS mutations remain outside this integration's current scope.
