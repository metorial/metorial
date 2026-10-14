# <img src="logo.jpeg" height="20"> Connecteam

Manage Connecteam employee profiles, custom fields, Smart Groups, time clocks, time-off requests, shift schedules, jobs, forms, Quick Tasks, chat messages, and onboarding assignments. Retrieve account identity and paginated leave requests. API access depends on the eligible subscription plan and purchased hubs.

Authenticate with an API key or OAuth 2.0 client credentials. Choose the Australian API host in the authentication settings when signing in at `app-au.connecteam.com`. OAuth access tokens retain their expiry and support renewal with the stored client credentials. Existing connections retain the previously stored API host until reauthenticated.

Use `get_account` to identify the company, `list_users` to discover employees, and the list actions in `manage_scheduler`, `manage_time_clock`, and `manage_tasks` to discover the IDs used by those tools. `list_time_off_requests` supports approved, pending, and denied requests within a date range of up to 365 days. Chat messages require a custom publisher ID, discoverable with `list_conversations` and `includePublishers`.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
