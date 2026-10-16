# <img src="logo.svg" height="20"> Push by Techulus

Send custom push notifications to iOS and Android devices via REST API. Deliver notifications to individual accounts, teams, or specific device groups with options for title, body, sound, channel, links, images, and time-sensitive delivery. Send notifications synchronously or asynchronously. Manage team membership by inviting or removing users from teams.

Use an account API key for personal devices, device groups, and team management. A team API key can send notifications to that team's members. Synchronous notification tools return the provider's per-device results when available; inspect them for individual failures. Async mode acknowledges the request without confirming delivery and is recommended for teams or more than ten devices.

See the [API quickstart](https://docs.push.techulus.com/api-integration) and [integration reference](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
