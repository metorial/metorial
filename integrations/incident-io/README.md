# incident.io

Declare, read and edit incidents; discover severities, statuses, roles, types and users; read follow-ups and automation workflows. Read on-call schedules and coverage, create temporary overrides and remove them. Maintain catalog entries, discover status pages and publish incident updates.

Connect with an organization API key from **Settings > API keys** with permissions for the workflows you need. Sending HTTP alert events additionally requires the configured alert source's secret in `alertSourceToken`; the organization API key does not authenticate ingestion. Alert source discovery excludes secrets.

Incident declarations, status changes, alert events and schedule overrides can run automation or notify responders. Standard and test incidents may create chat channels. Retrospective incidents without a supplied Slack channel ID do not create a Slack channel. Status-page updates are public even when subscriber notifications are disabled; notifications default to disabled. Incidents and status-page incidents have no supported deletion workflow here, while catalog deletion archives an entry.

List responses expose the provider's continuation cursor. Continue until no cursor is returned, including after a short or empty page. `returnedCount` is the current page length; optional `totalCount` is emitted only when the provider returns a total.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
