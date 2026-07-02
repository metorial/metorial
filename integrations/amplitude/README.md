# <img src="https://provider-logos.metorial-cdn.com/amplitude.svg" height="20"> Amplitude

Track user behavior, query product analytics, export raw events, and maintain core Amplitude project data. Ingest events through HTTP V2 or Batch APIs, update user and group properties, map identities, query Dashboard REST analytics, retrieve saved chart CSV results, manage behavioral cohorts, maintain taxonomy metadata, handle chart annotations, look up US-region user profiles, and submit or inspect user privacy deletion jobs. Enterprise/admin-only APIs such as Experiment, SCIM, lookup tables, releases, DSAR exports, and outbound streaming are not exposed by this integration.

## Tools

### Delete User Data

Request deletion of user data from Amplitude for privacy compliance (GDPR/CCPA). Supports deleting a single user or multiple users in bulk. You can also check the status of pending deletion jobs.

### Export Events

Export raw Amplitude event files for an uploaded-time range as a ZIP attachment. Structured output contains only metadata such as MIME type, byte length, and attachment count.

### Get Chart Results

Fetch CSV results from a saved chart in Amplitude by its chart ID. The chart ID can be found in the URL when viewing a chart, and CSV content is returned as a Slate attachment.

### Get User Profile

Retrieve a user's profile from Amplitude, including user properties, computed user properties, cohort memberships, and recommendations. Look up by user ID or Amplitude ID.

### Identify User

Set or update user properties for a specific user without sending an event. Supports Amplitude's property operations like $set, $setOnce, $add, $append, $prepend, $unset, and $clearAll. Can also be used for group identification and user identity mapping (aliasing).

### Manage Annotations

Manage chart annotations in Amplitude. Annotations mark important events on time-series charts (e.g., releases, campaigns, milestones). List, create, update, or delete annotations.

### Manage Cohorts

List cohorts, retrieve a cohort from the discoverable cohort list, check Behavioral Cohorts Download API usage, upload static cohorts, and incrementally add or remove cohort membership.

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
