# <img src="logo.png" height="20"> Rocketlane

Manage customer onboarding and implementation projects. Create, update, archive, and delete projects with phases, tasks, and custom fields. Track time entries, manage resource allocations, and handle financial data like invoices. Create and manage collaborative spaces and documents for sharing with customers. Manage companies (customers), users, conversations, and comments. Configure project templates and custom fields for projects, tasks, and companies.

List tools expose `pagination.nextPageToken`; supply it as `pageToken` to continue within 15 minutes. Existing `offset` inputs remain available and traverse provider pages. `get_company` and `get_phase` retrieve individual resources discovered with `list_companies` and `list_phases`.

Project creation requires a customer company and an owner; using a template also requires `startDate`. Task status inputs accept numeric status option IDs as strings, discoverable with `list_custom_fields`. Resource allocation queries require `startDate` and `endDate`. Invoice project filtering applies to the returned provider page, so continue with the page token even when a filtered page is empty.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
