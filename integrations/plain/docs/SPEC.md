# Plain API integration

Plain's GraphQL API uses machine-user API keys with fine-grained permissions.
Create a key under **Settings → Machine Users** and send it as
`Authorization: Bearer <API key>` to
`https://core-api.uk.plain.com/graphql/v1`. Connection profiles identify the
machine user and its workspace. There is no OAuth token refresh flow.

## Tools

| Area | Tools |
| --- | --- |
| Identity and discovery | `get_current_user`, `list_users`, `list_companies`, `list_tenants`, `get_tenant` |
| Customers | `upsert_customer`, `get_customer`, `list_customers`, `delete_customer`, `update_customer_company` |
| Threads | `create_thread`, `get_thread`, `list_threads`, `update_thread_status`, `assign_thread`, `change_thread_priority`, `list_thread_timeline` |
| Messaging and timeline | `reply_to_thread`, `send_email`, `create_note`, `create_timeline_event` |
| Labels | `manage_thread_labels`, `list_label_types` |
| Tenants and groups | `upsert_tenant`, `manage_customer_tenants`, `manage_customer_groups`, `list_customer_groups` |

## Request and response behavior

- Customer lookup and upsert accept one customer identifier. Customer upserts map
  update values into the API's value wrappers. Creation email defaults to an email
  identifier or the existing customer's email; when verification is omitted for a
  supplied email, it is sent as unverified.
- Tenant upserts retain the optional public `externalId` field. The request uses
  that value, the identifier's external ID, or the existing tenant's external ID.
  Tenant URLs are sent in the API's optional-string wrapper.
- Snooze durations are positive whole seconds. Thread priorities are integers
  from 0 (urgent) through 3 (low).
- Thread creation retains the currently supported component input. Reply
  components are converted into text and Markdown because the current reply API
  accepts those representations. Link buttons become links and spacer sizes become
  paragraph spacing. Email sends always include a text body; when only Markdown
  is supplied it is also used as the text fallback.
- Label removal verifies that the specified labels belong to the requested
  thread. Membership and label counters describe successfully processed requests;
  they do not distinguish already-existing memberships from newly created ones.
- Pagination uses `first` (1–100) and `after`, returning `hasNextPage` and
  `endCursor`. The customer list also returns the provider's total count.
- Thread timeline entries preserve their type name and selected provider fields.
  Email, chat, Slack, Microsoft Teams, Discord, internal notes, and custom events
  include content; other timeline entry types include their type name. This is a
  conversation reader and does not download files.
- Query errors, mutation errors, HTTP failures, invalid combinations, and missing
  resources produce structured service errors. GraphQL requests include only
  fragments reachable from the requested operation.

## Official references

- [Authentication](https://www.plain.com/docs/graphql/authentication)
- [Pagination](https://www.plain.com/docs/graphql/pagination)
- [Error handling](https://www.plain.com/docs/graphql/error-handling)
- [Customer upsert](https://www.plain.com/docs/graphql/customers/upsert)
- [Tenant upsert](https://www.plain.com/docs/graphql/tenants/upsert)
- [Thread status changes](https://www.plain.com/docs/graphql/threads/status-changes)
- [Replies](https://www.plain.com/docs/graphql/messaging/reply-to-thread)
- [Email sending](https://www.plain.com/docs/graphql/messaging/send-email)
- [Notes](https://www.plain.com/docs/graphql/notes)
- [Official API schema](https://github.com/team-plain/sdk/blob/ea29b9b4d0ef902cdc788f7ef0fe1019886f52ee/packages/graphql/src/schema.graphql)
