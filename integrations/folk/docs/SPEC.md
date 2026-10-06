# Folk integration

## Authentication and API version

Create an API key in workspace Settings > API. Requests use `Authorization: Bearer <key>` against `https://api.folk.app/v1` and pin `X-API-Version: 2025-06-09`. Access follows the associated user's group permissions; administrator visibility of group names does not imply access to every group's records. Authentication verifies `/users/me`, which identifies a user rather than a workspace. The existing `api_key` method, `apiKey` input, stored `token`, and empty configuration remain compatible.

Credentials, authorization headers and provider error bodies are omitted from failure messages. Requests have a 30-second timeout and do not follow redirects. HTTP failures retain their status; a returned `Retry-After` header is exposed as retry guidance. Writes are not retried automatically. Folk enforces quotas per user across that user's keys, including a burst quota. Respect the provider's current rate headers rather than relying on a fixed allowance.

## Tool coverage

| Workflow | Tools | API |
| --- | --- | --- |
| Authenticated user | `get_current_user` | `GET /users/me` |
| People | `create_person`, `get_person`, `update_person`, `delete_person`, `list_people` | `/people`, `/people/{id}` |
| Companies | `create_company`, `get_company`, `update_company`, `delete_company`, `list_companies` | `/companies`, `/companies/{id}` |
| Group-scoped deals/custom objects | `create_deal`, `get_deal`, `update_deal`, `delete_deal`, `list_deals` | `/groups/{groupId}/{objectType}` and `/{id}` |
| Discovery | `list_groups`, `list_custom_fields` | `/groups`, `/groups/{groupId}/custom-fields/{entityType}` |
| Notes | `create_note`, `update_note`, `delete_note`, `list_notes` | `/notes`, `/notes/{id}` |
| Existing reminders | `create_reminder`, `delete_reminder`, `list_reminders` | `/reminders`, `/reminders/{id}` |
| Tasks | `list_tasks`, `manage_task` | `/tasks`, `/tasks/{id}`, `/mark-as-done`, `/mark-as-to-do` |

There are 27 tools: all 24 original keys plus authenticated identity and two task tools. Historical input/output fields retain their types and requiredness. Search filters, note query/date bounds and selected create idempotency keys are optional additions. Existing company numeric response values are converted to their historical string representation; missing required response data is treated as a provider failure rather than invented.

Group administration, custom-field definition administration, outreach, enrichment, imports, bulk changes and webhook registration are outside this tool set. No notification trigger is registered. Notes support external links; the API does not document direct note attachment upload, and these tools do not generate downloadable files.

## Pagination and filtering

List tools return one page and a nullable `nextCursor`. Missing `pagination.nextLink` means the final page. Pass `nextCursor` as the next request's `cursor` and keep the same filters, group, object type and entity. Page size must be an integer from 1 to 100; cursors are bounded to the provider's documented maximum. Pagination links must refer to the exact requested resource on `api.folk.app`.

People, company, deal and task lists accept `filter`, keyed first by field and then by documented operator, plus an optional `and`/`or` combinator. For example, `{"fullName":{"eq":"Example Person"}}` finds a person by name, while `{"groups":{"in":[{"id":"grp_..."}]}}` selects group references. Repeated reference values are encoded as repeated query parameters. Text fields support `eq`/`like`; use only operators supported for the selected field. Task entity filtering uses `{"entity":{"in":"per_..."}}`.

Notes and reminders use the provider's `entity.id` query parameter. Notes additionally support full-text `query`, `createdAfter` and `createdBefore` timestamps. Group custom-field discovery accepts `person`, `company`, or the exact custom object name.

## Contact and deal writes

Person creation performs duplicate matching and can merge into existing data in the background. Use unique synthetic names and reserved email addresses for tests. Company names are unique; creating a company with an existing name returns that company. A company association requires exactly one existing company ID or company name; using a name can create a company. Funding amounts retain the established string input and output representation, with finite numeric strings converted to numeric USD amounts for provider requests; null clears funding during update.

Omitted update fields are preserved. Supplied arrays replace their entire lists; an empty array clears an array. Birthday accepts null during update. Company nullable funding, year and classification fields retain null values when supplied. Group custom values use `{groupId: {fieldName: value}}`; include the target group in `groupIds` when setting them. Null or an empty array clears an individual custom field according to its type. Removing a group also deletes that group's custom values.

Discover the exact deal `objectType` from the group's object fields. It need not be named `Deals`. A deal's related people and companies must belong to that same group. Delete actions require a matching provider acknowledgement and permanently remove the specified record.

People, company, deal and note creation accept an optional `idempotencyKey`. Reuse a key only for the same body after an uncertain response; completed keys are retained for 24 hours, and an in-progress request can return 409. A fresh logical creation needs a fresh key.

## Notes, reminders and tasks

Notes can be private or public. Markdown mentions of workspace users may notify them; creation and update require deliberate notification intent when mentions are present.

Reminders remain available for existing IDs and schedules, but all three reminder tools are marked deprecated. Folk's changelog gives February 13, 2027 as their sunset, while its migration guide gives February 11, 2027. The integration documents this discrepancy and recommends tasks for new workflows. Reminder recurrence uses iCalendar `DTSTART` with an IANA time zone and `RRULE`; public reminders require 1–50 assignees. Omit assignedUsers for private reminders; the API key owner is automatically notified.

`manage_task` uses an action field in a single object:

- `create`: requires `entityId`, `title` and a `YYYY-MM-DD` `dueAt`; optional time is `HH:mm`. Omitted assignment defaults to the API key's associated user, and visibility defaults to public. Set `isPublic: false` for a private task. Up to 50 assignees can be supplied, each with exactly one user ID or email.
- `get`, `update`, `delete`: require `taskId`. Update accepts only task fields; null clears description, due time or recurrence. Assignment replaces the assignee list. Deletion is permanent.
- `mark_done`: requires `taskId` and an ISO 8601 `completedAt` timestamp. Only this action changes an existing task to completed.
- `mark_to_do`: requires `taskId` and reopens the task with null completion. Due-date changes alone never complete a task.

Completion can optionally be supplied when creating a task; ordinary update cannot change it. Content fields are rejected on read, deletion and reopen actions. Task responses expose provider state and identifiers, and remain open to future provider string enum values. Reminder IDs and task IDs are distinct.

## Official references

- [Authentication](https://developer.folk.app/api-reference/authentication), [versioning](https://developer.folk.app/api-reference/versioning), [current user](https://developer.folk.app/api-reference/users/get-the-current-user), [rate limits](https://developer.folk.app/api-reference/rate-limits).
- [Pagination](https://developer.folk.app/api-reference/pagination), [filtering](https://developer.folk.app/api-reference/filtering), [group custom fields](https://developer.folk.app/api-reference/group-custom-fields/list-group-custom-fields).
- [People](https://developer.folk.app/api-reference/people/create-a-person), [company updates](https://developer.folk.app/api-reference/companies/update-a-company), [deal relationships](https://developer.folk.app/core-concepts/deals), [notes](https://developer.folk.app/api-reference/notes/create-a-note).
- [Tasks](https://developer.folk.app/api-reference/tasks/create-a-task), [task completion](https://developer.folk.app/api-reference/tasks/mark-a-task-as-done), [migration guide](https://developer.folk.app/migrations/reminders-to-tasks), [changelog](https://developer.folk.app/changelog).
