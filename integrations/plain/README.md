# <img src="logo.png" height="20"> Plain

Manage customer support customers, threads, messages, internal notes, tenants,
companies, labels, and customer groups.

Create a machine user and API key in **Settings → Machine Users**, granting the
permissions needed for your workflows. The API uses Bearer authentication at
`https://core-api.uk.plain.com/graphql/v1`.

- Identify the connection with `get_current_user`.
- Discover customer, user, company, tenant, label, and group IDs with the list tools.
- Create or update customers, manage memberships, and change company associations.
- Create, assign, prioritize, snooze, close, and reply to support threads.
- Read conversation content with `list_thread_timeline`, send outbound email, and
  create internal notes or custom timeline events.

List tools use `first` (1–100 records) and `after`; pass the returned `endCursor`
while `hasNextPage` is true. API keys have fine-grained permissions; upstream
errors identify missing permissions.

Reply components are converted to text and Markdown for the thread's channel.
Link buttons become links and spacers become paragraph spacing. Customer creation
needs an email, supplied explicitly or derived from the customer identifier. When
updating an existing customer or tenant, omitted creation email/external ID values
can be resolved from the existing record.

See the [API specification](docs/SPEC.md) and [Plain API documentation](https://www.plain.com/docs/graphql/introduction).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
