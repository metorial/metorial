# Remote API contract

The public scope and connection requirements are described in [README](../README.md). This package exposes 17 tools and no event subscriptions.

## Transport and response contract

Production uses `https://gateway.remote.com/v1`; sandbox uses `https://gateway.remote-sandbox.com/v1`. Requests have bounded timeouts and do not follow redirects. Resource IDs are validated before interpolation. Structured errors retain status and sanitized provider messages, without transport objects or credentials. Returned JSON redacts reflected credentials in strings and object keys.

Current responses use `data` objects containing named records, lists, and pagination. Exact reads require the requested resource ID to match the returned record. An offboarding may also identify itself by `offboarding_id`. Documented top-level `data` arrays are accepted where used by catalogs and policies. Malformed responses fail explicitly rather than becoming empty successes.

## Supported routes

| Area | Routes |
| --- | --- |
| Identity and companies | `GET /identity/current`; client-credentials-only `GET /companies` |
| Country discovery | `GET /countries`, `GET /countries/{country}/{form}` |
| Employment | `GET/POST /employments`, `GET/PATCH /employments/{id}`, `POST /employments/{id}/invite` |
| Amendments | `GET /contract-amendments` |
| Payslips | `GET /payslips`, authenticated `GET /payslips/{id}/pdf` |
| Leave | `GET/POST /timeoff`, `GET /timeoff/{id}`, `POST /timeoff/{id}/{approve,decline,cancel}`, `GET /timeoff/types`, `GET /leave-policies/{summary,details}/{employmentId}` |
| Expenses | `GET/POST /expenses`, `GET/PATCH /expenses/{id}`, `GET /expenses/categories` |
| Incentives | `GET/POST /incentives`, `GET/PATCH/DELETE /incentives/{id}`, `GET/POST /incentives/recurring`, `DELETE /incentives/recurring/{id}` |
| Offboarding | `GET/POST /offboardings`, `GET /offboardings/{id}` |
| Timesheets | `GET /timesheets`, `GET /timesheets/{id}`, `POST /timesheets/{id}/approve` |
| Cost discovery/estimation | `GET /cost-calculator/countries`, `GET /cost-calculator/regions/{slug}/fields`, `POST /cost-calculator/estimation` |

OAuth uses `/auth/oauth2/authorize` and `/auth/oauth2/token` on the selected host. Company authorization and customer token methods preserve their existing keys. Required endpoint scopes replace the historical blanket `company:manage` request. Refresh keeps the previous refresh token when the provider omits a rotated token; invalid expiry is rejected before normalization.

## Mutation contract

Country form versions accompany employment creates and updates. Partial update forms hydrate from a fresh employment. Update plus invitation is two provider operations: invitation failure explicitly reports that an accepted update may already have occurred.

Monetary fields accept safe integer hundredths only. Time off requires a complete explicit day/hour schedule. Expense update changes review status only. Recurring incentive deletion returns `alreadyScheduledIncentives` and sets `fullyCancelled` from that receipt, without asserting erasure or payout reversal. Termination detail risk facts are caller-supplied. All mutation results are provider acceptance/state records, not guarantees of later completion.

## Verification boundary

Schema contracts and controlled private scenarios cover the public scope. Local checks use mocks; provider behavior and country/product prerequisites require a dedicated sandbox profile and explicit fixture gates. No live personnel, payroll, reimbursement, or offboarding operations are part of routine verification.
