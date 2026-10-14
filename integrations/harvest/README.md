# <img src="logo.png" height="20"> Harvest

Track time, manage projects, and handle invoices and estimates. Discover authorized Harvest accounts and your current user profile, then create or update time entries, expenses, clients, contacts, projects, tasks, users, invoices, and estimates. Browse clients, projects, tasks, users, time entries, expenses, invoices, and estimates with pagination. Generate structured reports and email invoices or record their lifecycle events.

Use `list_accounts` to discover the account ID for account-scoped tools. Connections authorized for one Harvest account select it automatically. For multiple accounts, pass the chosen `accountId` with each tool call. Connections created before account discovery continue to use their stored account ID unless a tool input overrides it.

Clients, projects, tasks, and users accept the `nextCursor` returned by a previous call as `cursor`; `pageNumberKnown` indicates whether the provider returned a page number. Existing `page` inputs remain available. Invoices, estimates, time entries, and expenses use page-based pagination. When emailing an invoice, omit `eventType` and provide recipients or `sendMeACopy`. Setting `eventType` to `send` only marks the invoice sent.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
