# <img src="https://provider-logos.metorial-cdn.com/victorops.png" height="20"> Victorops

Manage incidents, on-call schedules, and alert routing for IT and DevOps teams. Create, acknowledge, resolve, and reroute incidents. Send alerts via REST endpoint to trigger or recover incidents with configurable routing keys. Manage on-call schedules, create overrides, and configure escalation policies with multi-step notification paths. Create and manage teams, users, contact methods, and paging policies. List and create routing keys, rotation groups, and scheduled overrides. Start and end maintenance mode to mute alerts during server maintenance. Search incident history, retrieve shift change reports, and send chat messages or notes to incident timelines. Receive webhook events for incident state changes, paging, and on-call changes.

## Tools

### Create Incident

Create a new incident and page the specified targets. Targets can be users or escalation policies. This replicates the manual incident creation process.

### Create On-Call Override

Take on-call from another user within an escalation policy. This creates an immediate on-call override, temporarily replacing the currently on-call user.

### Get On-Call

Get current on-call users and schedules. Can retrieve the organization-wide on-call roster, a specific user's on-call schedule, or a specific team's on-call schedule.

### Get Shift Log

Get shift change history for a team. Useful for analyzing on-call workload and generating shift reports over a given time period.

### Get Team Rotations

Get all rotation groups for a team. Rotations define recurring on-call schedules and are referenced by escalation policies to determine who is on-call.

### List Incidents

List currently open, acknowledged, and recently resolved incidents. Returns all active incidents across the organization with their current phase, paged users, and alert details.

### Manage Escalation Policy

List, get, create, or delete escalation policies. Escalation policies define who is on-call and the multi-step notification paths when incidents are triggered. You can also list policies for a specific team.

### Manage Incident Notes

Create, update, delete, or list notes on a specific incident. Notes provide a way to annotate incidents with additional context during and after incident response.

### Manage Incident

Acknowledge, resolve, or reroute one or more incidents. Supports acknowledging/resolving specific incidents by number, all incidents for a specific user, or rerouting incidents to different escalation policies or users.

### Manage Maintenance Mode

Check, start, or end maintenance mode. Maintenance mode temporarily mutes alerts for specific routing keys or globally, allowing server maintenance without paging team members.

### Manage Routing Keys

List all routing keys with their associated teams, or create a new routing key with escalation policy mappings. Routing keys connect incoming alerts to the appropriate escalation policies and teams.

### Manage Team

Create, update, retrieve, delete teams, or manage team membership. Also supports listing all teams, viewing team members and admins, adding or removing members.

### Manage User

Create, update, retrieve, or remove a user in the organization. Can also list all users. When removing a user, a replacement username is required.

### Search Incident History

Search through historical incidents with various filters. Useful for post-incident reviews, reporting, and analyzing incident patterns over time.

### Send Chat Message

Send a chat message to the VictorOps timeline. Messages appear in the team timeline and can be used to communicate during incident response.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
