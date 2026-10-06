# Breathe HR

Read employee, organization, absence, sickness, salary, bonus and training records. Create employee and sickness records, request or decide leave, cancel absences, and manage expenses and claims.

## Connection

Enable the API in the account's API settings as an administrator. Use a `prod-` key with production or a `sandbox-` key with sandbox. Requests use `X-API-KEY`; a mismatched key and environment fails before a request. The sandbox uses `api.sandbox.breathehr.info`, as documented in the environment guide and preview JavaScript. `get_account` returns the connected account identity.

## Workflows

The 20 existing tools remain. `manage_leave_request` also reads an exact request. `manage_expense` and `manage_expense_claim` also list records; claims can be read and deleted. All list outputs preserve records and expose available paging metadata. Paged resources accept positive page numbers and 1–100 records per page; unpaged configuration resources reject pagination options. Missing collections are errors; a genuine empty collection remains empty.

Employee creation requires name, email and join date. `joinDate` maps to the provider's current company-join-date field. The legacy `knownAs`, `lineManagerId` and employee-list status query are not documented by the current endpoints and fail with instructions to omit them. IDs for supported departments, divisions, locations, working patterns and allowances come from the corresponding read tools.

Leave creation uses `Holiday` or `OtherLeave`, real start/end dates and documented half-day fields. The legacy `otherLeaveReasonId` creation option is unsupported; omit it and select `leaveType`. Rejection requires a reason. Decisions require exact-record readback. Absence cancellation verifies the retained cancelled record; optional `employeeId` narrows its bounded readback. Cancellation does not erase personnel history.

Sickness creation requires a configured company sickness type ID supplied by an authorized administrator. Expense creation requires an expense type ID, a decimal-string amount and an explicit reimbursable choice. Claims require a nonempty set of existing unclaimed expenses for the same employee. A claim update requires an approval/rejection decision and acting employee ID; arbitrary legacy status changes are unsupported. Expense and claim deletion require the resource to be readable first, then confirm its absence. Approval, submission, notification and retained-history effects must be considered before writes.

ISO dates and existing slash-form dates are accepted. Decimal strings remain strings. Numeric response IDs and known amounts are checked for precision loss; no blanket precision guarantee for every numeric field is implied.

This surface does not administer payroll, employee roles, benefits, organizational settings, account documents or event subscriptions.

## Official references

[Developer guide](https://developer.breathehr.com/documentation/getting_started), [API reference](https://api.breathehr.com/v1/swagger_doc), [authentication](https://developer.breathehr.com/documentation/authenticating), [environments](https://developer.breathehr.com/documentation/environments), [paging](https://developer.breathehr.com/documentation/request_and_response/pagination?partial=pagination).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
