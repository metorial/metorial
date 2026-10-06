# Better Stack integration

Manage uptime monitors, heartbeats, incidents, status pages, on-call calendars, escalation policies and incoming webhooks. Manage telemetry sources and alerts, inspect dashboards, and download dashboard JSON configurations.

## Authentication and team selection

Use a Bearer API token: a team-scoped Uptime token, a team-scoped Telemetry token, or a Global token. Uptime and Telemetry tokens authorize their respective product tools. A Global token can authorize both products across accessible teams. The connection validates credentials with a read-only list request. The published REST catalog has no suitable current-user endpoint, so connection labels identify the validated token type.

The optional connection team name supplies the default team selection. Tools that list or create resources can override it with teamName. Global-token creation requires the owning team, except alert creation where the existing chart or exploration supplies the owner.

Requests use https://incidents.betterstack.com/api for Uptime and https://telemetry.betterstack.com/api for Telemetry. Monitors, heartbeats, status pages, calendars and incoming webhooks use v2; incidents and escalation policies use v3; telemetry resources use v2. The official uptime.betterstack.com alias is accepted for list continuation links.

## Tools

| Tool | Supported operations |
| --- | --- |
| list_monitors | Paginated monitor discovery; provider name/URL filters and per-page type, paused-state and group filters |
| manage_monitor | Create, get, update, pause, resume and delete monitors; HTTP headers, network ports and maintenance windows |
| list_incidents | Paginated discovery with date, monitor, heartbeat, acknowledgement and resolution filters |
| manage_incident | Create, get with optional timeline, acknowledge, resolve and delete |
| manage_heartbeat | List, create, get, update and delete; zero grace and paused creation |
| manage_status_page | List, create, get, update and delete; explicit published state |
| manage_on_call | List, create, get, rename and delete calendars; list and CRUD escalation policies/steps |
| manage_source | List and CRUD sources, ingestion pause, retention and VRL; platform/region selected at creation |
| list_dashboards | Paginated discovery/name search and full dashboard details including charts, sections and variables |
| manage_alert | List and CRUD threshold, relative and anomaly alerts; create on an existing dashboard chart or exploration |
| manage_incoming_webhook | List and CRUD webhook configuration, notification settings and creation/acknowledgement/resolution rules |
| export_dashboard | Download a JSON dashboard backup, including its chart and section configuration |

List responses include hasMore and nextUrl. Pass nextUrl to continue the same resource and provider filters. Keep type, paused and group inputs when continuing monitor pages because those filters apply to each retrieved page. Incidents and sources accept at most 50 records per page; other registered paginated resources accept at most 250.

## Notifications, publication and costs

Creating incidents, resuming monitors/heartbeats and enabling alerts can notify people or external integrations. Escalation policies can override simple notification settings. Status-page creation can publish publicly unless published is false. Longer telemetry retention may incur additional charges. Use dedicated resources and appropriate permissions for these operations.

Heartbeat ping URLs and incoming-webhook receiving URLs contain credentials. Retrieve them from the resource in Better Stack; ordinary results retain the legacy nullable URL fields with null values. Rule inputs accept one documented provider rule or a configuration with type and rules. The rule type unused matches every incoming payload; paused stops payload handling. These tools configure existing provider capabilities and do not subscribe to outgoing events.

Source ingestion credentials are omitted from ordinary results; the legacy token field remains nullable. Legacy liveTrailEnabled, incident callUrl/smsBody, webhook callUrl/confirmationPeriod and alert sourceId/query input fields remain in the schema but fail clearly when used for writes because the current APIs do not document them. Alert threshold maps to the provider value field; enabled maps to the inverse of paused. Dashboard, chart and exploration IDs are returned when supplied by the provider. The legacy anomaly input alias maps to anomaly_rrcf. Alert type cannot be changed after creation.

Dashboard exports use the stable authenticated provider download endpoint. There is no expiring signature to renew; invoke export_dashboard again to obtain another download. The JSON configuration is delivered as a file.

## Scope

Schedule events/rotations, status-page components/reports, incident comments, arbitrary SQL queries and ingestion, collectors, connection administration, dashboard import/creation and outgoing event subscriptions are outside the registered tool set. The provider supports additional APIs for some of these workflows; this integration does not claim them.

## Official documentation

- [Uptime API authentication](https://betterstack.com/docs/uptime/api/getting-started-with-uptime-api/)
- [Telemetry API authentication](https://betterstack.com/docs/logs/api/getting-started/)
- [Monitors](https://betterstack.com/docs/uptime/api/list-all-existing-monitors/)
- [Incidents](https://betterstack.com/docs/uptime/api/list-all-incidents/)
- [Escalation policies](https://betterstack.com/docs/uptime/api/list-all-escalation-policies/)
- [Sources](https://betterstack.com/docs/logs/api/list-all-existing-sources/)
- [Dashboards](https://betterstack.com/docs/logs/api/dashboards/list/)
- [Dashboard exports](https://betterstack.com/docs/logs/api/dashboards/export/)
- [Dashboard alert creation](https://betterstack.com/docs/logs/api/dashboard-alerts/create/)
- [Incoming webhook parameters](https://betterstack.com/docs/uptime/api/incoming-webhooks-response-params/)
