# <img src="https://provider-logos.metorial-cdn.com/statuspage.png" height="20"> Statuspage

Manage status pages to communicate incidents, outages, and scheduled maintenance to customers. Create, update, and resolve incidents with lifecycle tracking. Manage components representing infrastructure pieces and their statuses (operational, degraded, partial/major outage). Create and publish incident postmortems. Configure scheduled maintenance with subscriber reminders and auto-transitions. Manage subscribers (email, SMS, Slack, webhook, Teams) scoped to pages, components, or incidents. Submit and display custom system performance metrics. Create reusable incident templates for faster response. Control page access with user groups and role-based permissions. Configure embeddable status widgets.

## Tools

### Create Incident

Create a new incident on the status page. Supports realtime, scheduled, and backfilled (historical) incident types. - **Realtime**: Set \

### Get Incident

Retrieve detailed information about a specific incident including its full update history, affected components, and current status.

### Get Page

Retrieve the status page profile and settings including name, domain, subdomain, time zone, branding, and notification preferences. Use this to inspect current page configuration.

### List Components

List all components on the status page. Returns each component's name, status, group, and configuration. Use this to get an overview of all infrastructure pieces being tracked.

### List Incident Templates

List all incident templates configured for the status page. Templates contain pre-filled incident names, messages, statuses, and component associations for quick incident creation.

### List Incidents

List incidents on the status page with optional filtering. Can retrieve all incidents, only unresolved, only scheduled, or search by keyword.

### List Subscribers

List subscribers on the status page with optional filtering by type and state. Returns subscriber contact information and subscription scope.

### Manage Component Group

Create, update, or delete component groups on the status page. Component groups organize related components together. - To **create**: omit \

### Manage Component

Create, update, or delete a component on the status page. Components represent infrastructure pieces like APIs, apps, and services. - To **create**: omit \

### Manage Postmortem

Create, update, publish, or revert a postmortem for a resolved incident. Postmortems support a draft workflow: - **Get**: Retrieve the current postmortem for an incident. - **Save draft**: Provide \

### Manage Subscriber

Create, unsubscribe, or reactivate a subscriber on the status page. - To **create**: provide the subscriber \

### Submit Metric Data

Submit custom metric data points to a metric on the status page. Data points are timestamp/value pairs displayed as performance charts. Data should be submitted at least every 5 minutes for continuous display. Can backfill up to 28 days.

### Update Incident

Update an existing incident's status, message, impact, or associated components. Each update creates a new entry in the incident timeline. Use this to progress an incident through its lifecycle (investigating -> identified -> monitoring -> resolved) or to delete it.

### Update Page

Update status page profile settings such as name, domain, subdomain, time zone, branding/CSS, and subscriber notification preferences.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
