# FreshBooks integration contract

The released scope is 23 tools: all 20 original tool keys plus `get_identity`, `get_resource` and `list_resources`. Legacy field types, requiredness and enum choices remain serialized in `src/legacy-schemas.json` and covered by schema contracts. There are no triggers or webhook-registration tools.

## Authorization and selection

[OAuth authentication](https://www.freshbooks.com/api/authentication) uses authorization-code and refresh grants at `/auth/oauth/token`. Token requests include the original redirect URI; access/refresh tokens and positive expiry are validated before saving. Refresh tokens rotate and are single-use. Connections missing the saved redirect URI must reconnect.

Consent includes profile read and read/write for clients, invoices, payments, estimates, expenses, time entries, projects, taxes, billable items and credit notes. Unused bills/vendors/reports/admin scopes are removed. The [credits reference](https://www.freshbooks.com/api/credits) labels access as client scopes while the [scope catalog](https://www.freshbooks.com/api/scopes) also defines credit-note scopes; both resource families are used by this surface.

`GET /auth/api/v1/users/me` provides minimal identity and the exact business/account memberships. [Identity documentation](https://www.freshbooks.com/api/identity_model) distinguishes business IDs from membership IDs and describes users without an accounting account. Tools require an explicit account/business selection, with stored legacy values only as fallback. Selection must match one authorized membership; accounting tools refuse businesses without an accounting account. Matching business resolution is exact, never first-membership selection.

## Capability and route map

| Resource | Existing tools | API family |
| --- | --- | --- |
| Clients | manage, list, get | `/accounting/account/{accountId}/users/clients` — [clients](https://www.freshbooks.com/api/clients) |
| Invoices | manage, list, get | `/accounting/account/{accountId}/invoices/invoices` — [invoices](https://www.freshbooks.com/api/invoices) |
| Payments | manage, list | `/accounting/account/{accountId}/payments/payments` — [payments](https://www.freshbooks.com/api/payments) |
| Estimates | manage | `/accounting/account/{accountId}/estimates/estimates` — [estimates](https://www.freshbooks.com/api/estimates) |
| Expenses | manage, list | `/accounting/account/{accountId}/expenses/expenses` — [expenses](https://www.freshbooks.com/api/expenses) |
| Time entries | manage, list | `/timetracking/business/{businessId}/time_entries` — [time entries](https://www.freshbooks.com/api/time_entries) |
| Projects | manage, list | `/projects/business/{businessId}/project` for single resources; `/projects` for lists — [projects](https://www.freshbooks.com/api/project) |
| Taxes | manage, list | `/accounting/account/{accountId}/taxes/taxes` — [taxes](https://www.freshbooks.com/api/taxes) |
| Items | manage, list | `/accounting/account/{accountId}/items/items` — [items](https://www.freshbooks.com/api/items) |
| Credit notes | manage | `/accounting/account/{accountId}/credit_notes/credit_notes` — [credits](https://www.freshbooks.com/api/credits) |

`get_resource` supports documented exact GETs for payments, expenses, estimates, projects, time entries, taxes and items. `list_resources` supports estimates, credit notes and [expense categories](https://www.freshbooks.com/api/expense_categories); category writes are unsupported and are not added. Credit-note single-detail examples contradict their method/name, so no public detail route is invented. Credit updates/removal prove the ID through the documented collection, bounded to 50 pages. Credit writes use `clientid`, `credit_type: goodwill` for new notes and the `credit_notes` response array.

## Validation and response behavior

IDs are safe positive integers, account path components are validated, dates must be real calendar dates, and time timestamps have explicit ISO/10-digit seconds/13-digit milliseconds units. Money remains decimal text. Currency is explicit or proven from the existing resource/client/invoice, without a hard-coded USD fallback. Updates retain false, zero and empty clear values. Line replacement sends the complete replacement collection.

[Paging](https://www.freshbooks.com/api/parameters) accepts bounded integers, with `per_page` at most 100. Lists validate arrays, duplicate IDs, exact resource/account identities and provider totals/page metadata; missing metadata fails instead of becoming fabricated zero/one values. Client names use documented `fname_like`/`lname_like`; invoices use `statusid`, including zero. Time GETs and project GETs omit Content-Type. The inherited time-entry `projectId` selector remains forwarded as `project_id`, but the current time reference does not list it among filters; live filter behavior remains unverified.

Upstream failures become conservative ServiceErrors retaining only a validated numeric HTTP status, without transport parent graphs or provider messages. Decoded strings and keys are checked for current auth secrets; credential fields are omitted from safe provider data. Output schemas are validated before return, and mapped outputs expose exact IDs plus safe raw resource state where available.

## Lifecycle limits

FreshBooks [visibility states](https://www.freshbooks.com/api/active_deleted) distinguish inactive/deleted `1` from archived/hidden `2`. Accounting delete actions use `1` and retain history. Project/time/tax deletion follows documented DELETE requests. Exact documented empty acknowledgments are accepted without inventing a returned resource; output exposes the previously read record and `readbackRequired`. Cleanup completion requires independent readback.

Invoice send uses documented `action_email` and recipients; mark-as-sent uses `action_mark_as_sent`. Both activate accounting recognition, and email cannot be recalled. Lifecycle requests reject unrelated update fields because FreshBooks silently prioritizes action phases. Estimate-send's original enum remains, but the tool refuses the unverified modern email request and directs users to the provider interface.

There are no bill/vendor CRUD, report/export, PDF, notification/admin, online payment gateway, or webhook claims. The active private suite covers the released surface with identity checks, independent reads, controlled retained-effect gates and exact ownership-based cleanup. Static checks do not establish provider acceptance.
