# <img src="https://provider-logos.metorial-cdn.com/amplitude.svg" height="20"> Amplitude

Track user behavior, analyze engagement, and run experiments on a product analytics platform. Ingest event data via HTTP or batch APIs, query dashboard analytics including segmentation, funnels, retention, and session metrics. Export raw event data, look up user profiles, and manage behavioral cohorts. Create and manage feature flags and experiments, evaluate flag variants for users. Manage taxonomy (event types, event properties, user properties), upload lookup tables to enrich event data, and handle chart annotations. Modify user and group properties via Identify APIs, merge user identities, and manage user privacy including GDPR/CCPA deletion and data subject access requests. Provision users and permission groups via SCIM. Stream events, user updates, and cohort membership changes to external webhooks, and receive alerts when KPIs change.

## Tools

### Delete User Data

Request deletion of user data from Amplitude for privacy compliance (GDPR/CCPA). Supports deleting a single user or multiple users in bulk. You can also check the status of pending deletion jobs.

### Get Chart Results

Fetch results from a saved chart in Amplitude by its chart ID. Returns the same data that the chart displays in the Amplitude dashboard. The chart ID can be found in the URL when viewing a chart.

### Get User Profile

Retrieve a user's profile from Amplitude, including user properties, computed user properties, cohort memberships, and recommendations. Look up by user ID or Amplitude ID.

### Identify User

Set or update user properties for a specific user without sending an event. Supports Amplitude's property operations like $set, $setOnce, $add, $append, $prepend, $unset, and $clearAll. Can also be used for group identification and user identity mapping (aliasing).

### Manage Annotations

Manage chart annotations in Amplitude. Annotations mark important events on time-series charts (e.g., releases, campaigns, milestones). List, create, update, or delete annotations.

### Manage Cohorts

List, retrieve, create, or update behavioral cohorts in Amplitude. Cohorts are groups of users defined by shared behavior or characteristics. Use this to list all cohorts, get details of a specific cohort, or upload/update a cohort with specific user IDs.

### Manage Taxonomy

Manage your Amplitude tracking plan (taxonomy). Create, update, delete, and list event types, event properties, user properties, and event categories. Useful for programmatically maintaining a clean, well-documented tracking plan.

### Query Active Users

Retrieve active and new user counts over a specified date range. Returns time-series data showing how many users were active (performed any event) and how many were new during each interval. Supports segmentation and grouping by user properties.

### Query Event Segmentation

Analyze event data with segmentation, filtering, and grouping. Returns time-series or aggregate data for specific events, similar to Amplitude's Event Segmentation chart. Supports metrics like event totals, uniques, DAU, session averages, property sums/averages, and more.

### Query Funnel

Analyze conversion funnels to understand how users progress through a sequence of events. Returns step-by-step conversion rates and drop-off data. Supports "this order" (strict sequence) and "any order" modes, plus segmentation and grouping.

### Query Retention

Analyze user retention to understand how well users are retained over time after performing a starting event. Measures how many users come back to perform a return event on subsequent days/weeks/months.

### Query Sessions

Retrieve session metrics including session length distribution and average sessions per user over a date range. Useful for understanding user engagement depth and session patterns.

### Query User Composition

Analyze the distribution of a user property across your active users. Returns how many users have each value of the specified property (e.g., country breakdown, platform split, plan type distribution).

### Track Events

Send one or more events to Amplitude for analytics tracking. Supports all standard Amplitude event fields including user properties, event properties, revenue data, and device metadata. Use the batch mode for high-volume ingestion (>1000 events/second).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
