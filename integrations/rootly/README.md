# <img src="logo.jpeg" height="20"> Rootly

Find, create, update and delete incidents and their follow-up action items. Inspect, ingest, acknowledge and resolve alerts. Create, inspect, update and delete heartbeat monitors, and read current on-call coverage, schedules, escalation policies, services, teams, users, workflows, severities and environments.

Connect with a Rootly API key. The key's Global, Team or Personal scope and assigned roles determine which resources and operations are available. The current user is checked when connecting.

List tools validate the provider's page metadata and related resources. On-call pagination applies to Rootly's complete current-coverage response. Alert search and sorting, and action-item search, apply within the fetched page. For a selected incident, action-item status filtering and sorting also apply within the fetched page; filtered totals are omitted. Action-item updates verify membership in the supplied incident. Incident updates preserve the existing kind and privacy setting unless a supported privacy change is requested.

Creating incidents, ingesting alerts and enabling heartbeats can trigger notifications or configured automation. Verify the target before performing changes. Open alerts cannot be acknowledged. Incident, action-item and heartbeat deletion is permanent. Resolving an alert does not resolve its associated incidents. Heartbeat details omit the ping bearer secret; retrieve that secret from Rootly when configuring a ping sender.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
