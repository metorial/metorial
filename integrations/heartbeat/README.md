# Heartbeat

Manage community members, profiles, access groups, channels, threads, comments,
events, direct messages, and invitation links using the Heartbeat community API.
Discover role IDs, group IDs, and channel categories before creating resources.
Read operations preserve provider metadata, including real thread permalinks and
file URLs. Write operations retain the provider response without inventing IDs.

Create an API key in **Settings > System > API Keys**. The connection uses Bearer
authentication and does not require a community ID or separate configuration.

The current tools follow the [official Heartbeat API reference](https://heartbeat.readme.io/reference/authorization).
Original tools use current request and response mappings where their public
contracts can be preserved. Five older contracts retain deprecation guidance
where current requirements need a new value or change an input meaning. See [API details](docs/SPEC.md)
for the replacement map and limits. Invitation link creation does not send emails.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
