# <img src="logo.svg" height="20"> Proofly

Manage social proof campaigns and retrieve notification settings, performance statistics, and collected leads. Discover campaigns and notifications, toggle campaign status, and inspect account activity, impression usage, and pixel settings.

Authenticate with the API key shown on the [Proofly developers page](https://proofly.io/developers). Use `list_campaigns` to discover campaign IDs, then `get_campaign_notifications` to discover notification IDs for `get_notification` and `get_notification_data`.

The existing `create_conversion` tool is retained for compatibility. Its endpoint is absent from the current public API reference, and a successful result requires Proofly to explicitly acknowledge the operation. The [REST API guide](https://proofly.io/helpdesk/proofly-rest-api) lists a separate lead-ingestion endpoint without specifying its payload or response schema; that endpoint is not substituted for the existing conversion tool.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
