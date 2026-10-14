# <img src="logo.jpeg" height="20"> Webvizio

Create, find, update, and delete website feedback projects and tasks. Create, find, and delete task comments. Manage task status, priority, due dates, assignees, tags, file links, and time logs, including updating existing time-log entries by ID. Synchronize resources using external IDs.

Connect with a personal access token from the Webhooks tab in your Webvizio account settings. Project, task, and comment operations require one of the documented resource identifiers; find_project also supports the project name. Task dueDate maps to the provider's executeAt field, and time-log durations use whole minutes.

See the [tool and API reference](docs/SPEC.md) and [Webvizio incoming-webhook documentation](https://webvizio.com/help-center/incoming-webhooks/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
