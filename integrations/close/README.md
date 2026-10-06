# <img src="https://provider-logos.metorial-cdn.com/close.svg" height="20"> Close

Manage Close CRM leads, contacts, opportunities, tasks, notes and email templates. Read activities, users, Smart Views and pipeline configuration. Search leads, save email drafts, submit explicitly addressed email sends, and inspect the connected user and organization.

## Authentication

Connect an API key scoped to its Close user and organization, or use OAuth with `all.full_access` and `offline_access`. OAuth refresh uses the provider's actual token lifetime and rotates the refresh token. The connection requires no organization ID configuration. Get Current User returns accessible organizations and safe email-account identities.

## Tools

| Workflow | Tools |
| --- | --- |
| Connection identity | Get Current User |
| Leads | Get Lead, List Leads, Search Leads, Manage Lead, Delete Lead |
| Contacts | List Contacts, Manage Contact |
| Opportunities | List Opportunities, Manage Opportunity |
| Tasks | Get Tasks, Manage Task, Delete Task |
| Activities and notes | List Activities, Manage Note |
| Email | Send Email, Manage Email Template |
| Discovery | List Users, List Smart Views, List Pipelines and Statuses |

Get Tasks supports a task ID or paginated filters, including completion and assignment. Manage Task creates lead tasks or contact call reminders; a reminder does not place a call. Task text may include line breaks; only lead tasks support text updates. Delete Lead removes the lead and its related CRM records, while Delete Task removes only the specified task. Confirm the target before deletion. Provider audit history and recovery copies may remain; this integration does not restore deleted leads.

## Compatibility and paging

Existing tool keys and schema fields remain available. Most lists use `limit` and `skip`, and return `hasMore` plus `nextSkip`. Totals and expanded response fields are omitted when Close does not supply them. Lead detail reads retrieve contacts and opportunities separately if Close omits the deprecated embedded collections.

Search Leads uses the current Advanced Filtering API. It maps `fields` to lead fields, supports nested sorting and legacy `field_name` sorting, and returns `nextCursor`. Reuse a cursor within 30 seconds with the same filters. Legacy `skip` reads and discards bounded cursor pages; narrow large searches because the provider limits pagination to 10,000 objects. List Leads retains its legacy textual `query` parameter.

Manage Lead accepts nested contacts only when creating. For an existing lead, use Manage Contact; an unsupported nested update fails explicitly. Custom field keys accept `cf_*` or `custom.cf_*`. Prefer field IDs because Close deprecates field-name syntax. Supplying contact collections or multivalue custom field values can replace those values; review supplied data before updating.

## Email behavior

Send Email defaults to `outbox`, which requests actual delivery. Supply explicit `sender` and `to` recipients. `draft` saves without sending; `sent` logs an email that was already sent. Returned status is provider state and does not independently prove delivery.

The existing subject and body inputs remain required and override a selected template. Choose `sender` and optional `emailAccountId` using Get Current User's email identities. Legacy `sendAs` remains in the schema but fails with migration guidance because the current email API does not document a compatible mapping. Sending, CRM workflow side effects and associated costs must be authorized.

See the [Close API documentation](https://developer.close.com/api/overview) and [package specification](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
