# <img src="https://provider-logos.metorial-cdn.com/pagerduty.png" height="20"> Pagerduty

Manage incidents, services, and on-call schedules for infrastructure and application incident response. Create, acknowledge, escalate, and resolve incidents. Configure escalation policies, on-call rotations, and event orchestration rules. Ingest alerts and change events from monitoring tools via the Events API. Manage users, teams, contact methods, and notification rules. Access incident analytics and audit trails. Configure maintenance windows, business services, custom fields, and incident workflows. Subscribe to webhooks for incident and service lifecycle events.

## Tools

### Create Incident

Create a new PagerDuty incident on a specified service. Supports setting urgency, priority, assignments, escalation policy, conference bridge details, and a detailed description body.

### Get Incident Analytics

Retrieve aggregated incident analytics from PagerDuty. Includes metrics like mean time to resolve, mean time to acknowledge, total incident count, and uptime percentage. Can be filtered by time range, services, teams, and urgency.

### Get Incident

Get detailed information about a specific PagerDuty incident, including its notes, assignments, alerts, and timeline. Optionally fetch the incident's notes.

### List Escalation Policies

List PagerDuty escalation policies with optional filtering by name, user, or team. Returns policy details including escalation rules and targets.

### List Incidents

List and search PagerDuty incidents with filtering by status, service, team, user, urgency, and time range. Returns incident details including assignments, priority, and alert counts.

### List On-Calls

Query who is currently on-call across schedules, escalation policies, or for specific users. Can be filtered by time range and escalation level. Useful for determining responder availability.

### List Priorities

List all configured incident priorities for the PagerDuty account. Priorities are used to classify the importance of incidents and can be set when creating or updating incidents.

### List Schedules

List PagerDuty on-call schedules with optional search filtering. Returns schedule details including time zone, users, and associated escalation policies.

### List Services

List PagerDuty services with optional filtering by team or search query. Returns service details including status, escalation policy, and integrations.

### List Teams

List PagerDuty teams with optional search filtering. Teams are collections of users and escalation policies representing groups within an organization.

### List Users

List PagerDuty users with optional search query and team filtering. Returns user details including name, email, role, and team memberships.

### Manage Maintenance Window

Create, list, or end PagerDuty maintenance windows. During a maintenance window, no incidents will be triggered on the affected services. Use this to schedule planned downtime.

### Manage Service

Create, update, or delete a PagerDuty service. When creating, an escalation policy is required. Supports configuring auto-resolve timeout, acknowledgement timeout, alert creation settings, and urgency rules.

### Send Event

Send an alert event or change event to PagerDuty via the Events API v2. Alert events can trigger, acknowledge, or resolve incidents. Change events provide deployment/change context for responders.

### Update Incident

Update a PagerDuty incident — acknowledge, resolve, reassign, change urgency, escalation policy, priority, or add a note. Also supports snoozing and merging incidents.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
