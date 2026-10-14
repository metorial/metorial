# <img src="logo.svg" height="20"> ServiceM8

Manage ServiceM8 jobs, clients, contacts, staff scheduling, job materials, notes and payments. The integration includes 19 tools and supports OAuth 2.0 or a private application API key.

Use `get_account` to identify the connected account and its currency and timezone. Discover clients with `list_clients`, contacts with `list_contacts`, staff with `list_staff`, and catalog materials with `list_materials` before creating or updating related records. List tools follow the provider's cursor pagination.

Existing API-key connections are recognized from their token-only authentication output and use the required API-key header. OAuth connections need to authorize the current scope list to use contact management, payment recording, job notes and account discovery.

`create_job` defaults an omitted status to Quote. Job due dates, contact job titles and separate job-material descriptions are not supported by the corresponding write endpoints. These retained input fields return a clear error when supplied. Use the job material name for invoice text. If `schedule_job` creates a booking but its separate staff allocation fails, the result includes the booking UUID and `allocationError`; inspect the booking before retrying.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
