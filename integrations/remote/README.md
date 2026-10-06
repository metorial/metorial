# Remote

Read and manage supported Remote employment, leave, expense, incentive, and review records. Discover country-specific forms before creating or updating an employment. Download payslip PDFs and obtain indicative EOR cost estimates.

## Tools

| Tool | Supported outcome |
| --- | --- |
| `get_current_identity` | Read the authenticated company, user, integration, and documented token mode. |
| `list_companies` | Return the actual company identity summary for company/customer tokens, or the documented partner company collection for client credentials. |
| `list_countries` | Discover employment countries or cost-calculator regions and currencies. |
| `get_country_form_schema` | Read a current employment form or cost-region field schema. |
| `list_employments`, `get_employment` | Read employment pages or an exact record. |
| `create_employment` | Create a country-valid employment record; enrollment and onboarding remain separate. |
| `update_employment` | Merge supplied partial forms with a fresh record and optionally request enrollment invitation separately. |
| `list_contract_amendments` | Read amendment pages and filters supported by the endpoint. |
| `list_payslips`, `download_payslip` | Read payslip pages or prepare a downloadable PDF. |
| `manage_time_off` | Discover types and policies, read records, create already-approved leave, or approve/decline/cancel eligible records. |
| `manage_expenses` | Read expenses and category hierarchy, create already-approved expenses, or approve/decline pending records. |
| `manage_incentives` | Read and manage one-time or monthly recurring incentives; report already-scheduled payouts after recurring cancellation. |
| `manage_offboarding` | Read or submit termination review requests with explicit termination details. |
| `manage_timesheets` | Read timesheets or approve a submitted record. |
| `estimate_employment_cost` | Estimate region-specific costs without asserting actual hiring costs or eligibility. |

## Connections

Production and sandbox each support company OAuth authorization and customer API tokens. Use `ra_live_` customer tokens for production and `ra_test_` tokens for sandbox. OAuth uses Remote's authorization, token, and refresh endpoints with the scopes needed by these tools. Identity is checked when connecting and whenever a tool depends on the current company or authorizing user. A missing company alone is insufficient evidence of partner access.

The existing OAuth methods authorize a company; they do not obtain client-credentials tokens. If a documented client-credentials identity is already available to the integration, `list_companies` can use Remote's partner list. Company/customer connections return only the real identity summary, labelled `identity_summary`, rather than fabricating full company fields.

## Amounts and lifecycle effects

Remote monetary inputs use **safe integer hundredths**: `50025` means `500.25` in the specified or employment currency. Cost-estimate salary uses the chosen region's currency. Values are never implicitly scaled or converted. Read provider currency and region discovery first.

Returned expense, incentive, payslip, and cost amounts must also be exact safe integer hundredths. An amount that cannot be represented exactly fails with an actionable error instead of returning a rounded value. Signed safe amounts and null values remain unchanged.

Leave creation produces already-approved leave. Expense creation produces already-approved expenses that may enter reimbursement processing. An accepted invitation request does not prove email delivery. A termination request starts provider review; it does not prove completed offboarding. Deleting a recurring incentive cancels pending occurrences only: already-scheduled payouts and historical records remain. Successful responses describe the accepted operation and actual returned state.

## Current API compatibility

Existing tool keys and legacy fields remain discoverable. Unsupported legacy combinations return actionable validation errors rather than being silently ignored or described as retired:

- Use current `personal_details`/`contract_details` forms in place of old country-form aliases, and supply explicit `timeoffDays` instead of half-day flags.
- Expense updates accept review status only, not amount/category/receipt edits. The current expense list, recurring-incentive list, timesheet list, and offboarding list do not document all historical filters; omit unsupported filters and inspect returned pages.
- Incentives use the employment currency. Recurring schedules use an effective date and duration; an old end date is accepted only when it maps exactly to the documented monthly rule.
- Offboarding submission requires explicit termination details and risk answers. Unsupported resignation or last-working-date inputs are rejected with remediation.

List tools expose the pagination information actually returned by Remote; missing metadata is not replaced with invented counts. Dynamic country forms remain provider-validated, and access depends on token permissions, enabled company products, country, and record state. This integration has no event subscriptions.

## Sources

[Authentication](https://developer.remote.com/docs/authentication), [scopes](https://developer.remote.com/docs/scopes), [money format](https://developer.remote.com/docs/money-format), [employment forms](https://developer.remote.com/docs/create-new-employment), [time off](https://developer.remote.com/docs/working-with-time-off), [expenses](https://developer.remote.com/docs/working-with-expenses), [incentives](https://developer.remote.com/docs/working-with-incentives), and [cost estimation](https://developer.remote.com/docs/employment-cost-estimation).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
