# <img src="https://provider-logos.metorial-cdn.com/opsgenie.png" height="20"> Opsgenie

Create, manage, and resolve alerts and incidents with priority levels, responders, and rich metadata. Configure on-call schedules with rotations and overrides, and query who is currently on-call. Define escalation policies to notify responders in order when alerts go unacknowledged. Manage teams, users, services, and integrations. Set up per-user notification rules with contact method preferences. Receive webhook notifications for alert activity such as creation, acknowledgment, and closure.

## Tools

### Alert Action

Perform an action on an existing alert: close, acknowledge, unacknowledge, snooze, assign ownership, escalate, add a note, or add/remove tags. All actions are processed asynchronously.

### Create Alert

Create a new alert in OpsGenie. Alerts are processed asynchronously — the returned requestId can be used to track processing status. Supports setting priority, responders, tags, custom details, and more.

### Create Incident

Create a new incident in OpsGenie. Incidents are higher-severity events that may impact services and require coordinated response. Only available on Standard and Enterprise plans.

### Get Alert

Retrieve detailed information about a specific alert. Supports lookup by alert ID, tiny ID, or alias.

### Get Incident

Retrieve detailed information about a specific incident. Only available on Standard and Enterprise plans.

### Get On-Call

Query who is currently on-call or who is next on-call for a specific schedule. Returns the on-call participants. Use "current" to see who is on call now, or "next" to see who will be on call next.

### Get Team

Retrieve detailed information about a specific team, including its members and their roles.

### Get User

Retrieve detailed information about a specific user, including their role, timezone, and optionally their teams, schedules, and escalation policies.

### Incident Action

Perform an action on an existing incident: close, resolve, delete, or add a note. Only available on Standard and Enterprise plans.

### List Alerts

List and search alerts in OpsGenie. Supports filtering by query, pagination, and sorting. Use the query parameter with OpsGenie search syntax (e.g., \

### List Escalations

List all escalation policies in the account. Returns each policy with its rules and repeat configuration.

### List Incidents

List and search incidents in OpsGenie. Supports filtering by query, pagination, and sorting. Only available on Standard and Enterprise plans.

### List Schedules

List all on-call schedules. Optionally expand to include rotation details.

### List Services

List services in the OpsGenie account. Supports filtering, pagination, and sorting. Only available on Standard and Enterprise plans.

### List Teams

List all teams in the OpsGenie account. Returns team names, descriptions, and member counts.

### List Users

List users in the OpsGenie account. Supports filtering, pagination, and sorting.

### Manage Escalation

Create, update, or delete an escalation policy. Escalation policies define the order and timing of notifications when alerts are not acknowledged. Rules specify conditions, delays, and recipients.

### Manage Schedule

Create, update, or delete an on-call schedule. When creating, provide a name and optionally rotations and timezone. When updating, provide the schedule identifier and fields to change. When deleting, provide the identifier with the delete action.

### Manage Service

Create, update, or delete a service. Services represent business services impacted by incidents. Only available on Standard and Enterprise plans.

### Manage Team

Create, update, or delete a team. Teams are the organizational unit for on-call schedules, escalation policies, and alert routing. When updating members, note that the members list replaces the entire existing list.

### Manage User

Create, update, or delete a user. When creating, provide username (email), full name, and role. When updating, provide the user identifier and the fields to change.

### Update Alert

Update properties of an existing alert. Can update the message, description, and priority. Each field is updated independently — only provide the fields you want to change.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
