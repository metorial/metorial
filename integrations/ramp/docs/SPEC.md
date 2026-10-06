# Ramp

The integration exposes 18 tools for Ramp corporate spending and organizational data.

| Capability | Tools |
| --- | --- |
| Transactions | `list_transactions`, `get_transaction` |
| Users | `list_users`, `manage_user`, `get_task_status` |
| Cards | `list_cards`, `manage_card` |
| Bills | `list_bills`, `manage_bill` |
| Reimbursements | `list_reimbursements`, `get_reimbursement` |
| Organizational metadata | `manage_department`, `manage_spend_program`, `list_entities` |
| Spending budgets | `manage_limit` |
| Business and vendors | `get_business`, `list_vendors` |
| Exact resource verification | `get_resource` |

OAuth and internal client-credentials authentication select the environment during connection setup. Production and sandbox require separate application credentials. Business information identifies the connected business, not a signed-in person. Use only the scopes and account permissions required for the selected tools. See [authorization](https://docs.ramp.com/developer-api/v1/authorization).

List tools return a next-page URL when more results exist. Pass it back as `cursor` for the same resource and environment, preserving any original filters. Page sizes must be integers from 2 to 100. See [pagination](https://docs.ramp.com/developer-api/v1/pagination).

Select `cardType=physical` or `virtual` for current card listings and `apiVersion=current` for current physical-card mutations. Select `resource=fund` for current funds and use `fundId`. Virtual-card issuance belongs to fund creation. Legacy card and limit selectors remain the default to preserve existing requests; their availability and deferred status routes are not established by the current public reference. A legacy `limitId` is never treated as a `fundId`. See [cards and funds](https://docs.ramp.com/developer-api/v1/cards-and-funds).

New authentication grants request current Funds scopes and omit legacy Limits scopes. Legacy limit operations require an existing suitable grant and independently confirmed account support. Choose `resource=fund` on new connections.

User invitation returns a deferred task ID. `get_task_status` checks the documented user task endpoint; `STARTED` and `IN_PROGRESS` are pending, `ERROR` failed and `SUCCESS` requires an independent user readback. An invitation does not establish accepted onboarding. Keep the task ID and caller-supplied idempotency key; duplicate keys may be rejected, so resolve ambiguous outcomes through task or exact-email readback before another create attempt. Draft users can avoid invitation delivery and retain user/task history. See [deferred tasks](https://docs.ramp.com/developer-api/v1/deferred-tasks).

Bill creation automatically approves the bill and may initiate payment. Supply the required invoice dates, currency, vendor, entity and deliberate contact/payment selection. Line-item amounts are forwarded without denomination conversion; aggregate `amount` is rejected with guidance to use `lineItems`. Updating `lineItems` replaces the complete list. Archiving retains financial history and can cancel payments or terminate an attached one-time card. Current funds and physical cards support permanent termination. See [Bills](https://docs.ramp.com/developer-api/v1/api/bills) and [Funds](https://docs.ramp.com/developer-api/v1/api/funds).

Returned records omit payment credentials and signed file URLs. File delivery, receipt uploads, reimbursement mutations, accounting synchronization, separate bill approval/payment tools and event triggers are outside the implemented surface.
