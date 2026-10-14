# <img src="logo.jpeg" height="20"> Leadfeeder

Access B2B website visitor leads and tracked website accounts using existing Leadfeeder legacy API credentials. Retrieve company details, visit routes, traffic sources, custom lead feed criteria, website tracking scripts, and downloadable JSON lead exports. Enrich IP addresses with an existing separate legacy IP-Enrich API key. Newly issued keys for the /v1 API are not supported.

Use `get_accounts` to find account IDs, `get_account` to inspect tracking status, and `get_custom_feeds` or `get_custom_feed` to choose and inspect a feed. `export_leads` creates an asynchronous export; `get_export_status` checks progress and provides the completed report, and `download_export` retrieves a downloadable JSON report for an existing completed export.

Existing legacy API tokens and IP-Enrich keys remain supported. Leadfeeder no longer issues new credentials for either legacy API. The current `/v1` API uses different authentication and is not included in these tools.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
