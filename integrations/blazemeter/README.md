# <img src="logo.png" height="20"> Blazemeter

Create, configure, and run performance tests; inspect their results and manage cron schedules. Organize tests across accounts, workspaces, and projects. Manage API monitoring buckets, tests, environments, and test runs with an API Monitoring OAuth connection. Retrieve the current user and monitoring team identifiers. Virtual service and mock transaction operations use a BlazeMeter API key connection.

Performance schedules return a string `scheduleKey` for deletion. API Monitoring bucket creation requires a `teamUuid`, available from `get_current_user`. Reauthorize existing API Monitoring connections to grant the test and bucket scopes used by these tools.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
