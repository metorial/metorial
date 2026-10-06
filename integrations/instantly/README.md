# <img src="logo.png" height="20"> Instantly

Manage draft campaigns, lead records and lists, labels, custom tags, block lists, sending-account settings and campaign analytics through the V2 API. Read inbox messages and submit replies, check verification results and track asynchronous lead moves. A current-workspace lookup identifies the workspace associated with an API key.

Use a V2 API key with only the resource scopes needed for your workflow. V1 keys are incompatible. Campaign activation/resumption and replies can send real emails; verification can spend credits. Lead moves return background jobs and do not imply completion.

Sender associations can be read by account email or campaign. The current documented API does not expose standalone mapping create/delete routes or opaque mapping IDs. Legacy add/remove inputs remain recognized and fail with an explanation; use the campaign's complete `sendingAccounts` replacement list to change senders. Lead-label color is likewise retained as a legacy input but unsupported by the current label API.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
