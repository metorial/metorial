# <img src="logo.jpeg" height="20"> AgencyZoom

Manage insurance leads, customers, opportunities, policies, tasks, and service tickets in AgencyZoom. Discover configuration IDs, work with lead quotes and notes, manage opportunity drivers and vehicles, retrieve AMS policy data, and inspect dashboard sales summaries.

Connect with your AgencyZoom account email and password. Policy creation additionally requires the provider's `X-Api-Token` credential. The legacy API key and secret connection remains available, but its authorization for these REST endpoints is not established by the current public API documentation.

Some operations require additional fields at the provider even though those fields remain optional in the tool schema for compatibility. Follow each tool's field help and use `list_reference_data` to discover IDs. Searches translate offset/limit into provider pages; free-text and unsupported server-side filters may scan several pages. Narrow date, status, or assignment filters for large result sets.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
