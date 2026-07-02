# <img src="https://provider-logos.metorial-cdn.com/mixpanel.svg" height="20"> Mixpanel

Track, import, and query product analytics data. Send events, manage user and group profiles, query analytics reports including funnels, retention, segmentation, cohorts, event counts, and event property breakdowns, export raw event data as attachments, manage annotations, manage identities, and sync cohort membership changes via webhooks.

## Tools

### Export Raw Events

Export raw event data from Mixpanel for a specified date range as a JSONL attachment. Useful for feeding data into external systems or performing custom analysis.

### Get Activity Feed

Retrieve a user's event activity stream from Mixpanel. Shows all events performed by specific users within a date range, in chronological order.

### Get Top Events

Get today's most popular events in the Mixpanel project ranked by volume. Useful for a quick overview of current event activity.

### Import Events

Send a batch of events to Mixpanel. Supports historical events older than 5 days (use Track Events for recent real-time events). Each event requires an event name, a distinct user ID, a Unix timestamp, and an insert ID for deduplication. Up to **2000 events** per request.

### List Cohorts

List all saved cohorts in the Mixpanel project. Returns cohort IDs, names, descriptions, and member counts. Cohort IDs can be used to filter profiles in **Query User Profiles**.

### List Event Properties

List the top property names observed for a Mixpanel event, ordered by event count.

### List Event Property Values

List the top observed values for a property on a Mixpanel event.

### List Funnels

List all saved funnels in the Mixpanel project. Returns funnel IDs and names that can be used with the **Query Funnel** tool.

### Manage Annotations

Create, list, or delete annotations in a Mixpanel project. Annotations mark significant events on the project timeline (e.g., product launches, incidents, campaigns) to provide context in reports.

### Manage Group Profile

Create or update a group profile in Mixpanel. Groups represent entity-level analytics such as companies or accounts. Supports setting properties, setting properties only once, list-property updates, unsetting properties, or deleting the group profile entirely. Requires Group Analytics to be enabled on the Mixpanel project.

### Manage Identities

Link anonymous and identified users or merge two distinct IDs in Mixpanel's identity management system. Use **identify** to connect a pre-login anonymous ID with a post-login user ID. Use **merge** to combine two distinct IDs into one identity cluster. Merging is **irreversible**.

### Manage User Profile

Create or update a user profile in Mixpanel. Supports multiple operations: setting properties, setting properties only if not already set, incrementing numeric properties, appending/removing values from list properties, unsetting properties, or deleting the entire profile. Provide the desired operation and the corresponding data.

### Query Funnel

Query a saved funnel report in Mixpanel. Returns conversion data for each step of the funnel over a date range. Use **List Funnels** first to discover available funnel IDs.

### Query Event Counts

Get aggregate total, unique, or average counts for one or more Mixpanel events over a date range or recent interval.

### Query Event Property Values

Get aggregate total, unique, or average counts for values of a specific property on a Mixpanel event.

### Query Insights Report

Query a saved Insights report in Mixpanel by its bookmark ID. Returns the computed report data as shown in the Mixpanel web app.

### Query User Profiles

Search and retrieve user profiles from Mixpanel. Filter by property expressions, specific distinct IDs, or cohort membership. Returns paginated results with profile properties. Use sessionId and page for pagination.

### Query Retention

Query retention data from Mixpanel. Supports both **birth retention** (users who did a first event and returned) and **compounded retention** (overall return rate). Returns retention counts per cohort date bucket.

### Query Segmentation

Query event segmentation data from Mixpanel. Returns event counts segmented by a property over a date range, bucketed by time unit. Useful for understanding how often an event occurs, broken down by property values.

### Track Events

Send real-time events to Mixpanel from your application. Only accepts events within the last 5 days. For older/historical events, use Import Events instead.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
