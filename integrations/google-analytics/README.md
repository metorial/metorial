# <img src="https://provider-logos.metorial-cdn.com/googleanalytics.png" height="20"> Google Analytics

Query and retrieve analytics reports on user interactions, traffic, and engagement metrics across websites and apps. Send event data to GA4 via the Measurement Protocol for tracking server-side and offline interactions. Manage GA4 accounts, properties, data streams, and user permissions. Create and manage custom dimensions, metrics, audiences, and key events. Generate real-time and funnel reports with configurable dimensions, metrics, date ranges, and filters. Link properties with Firebase, Google Ads, BigQuery, and other Google services. Audit data access and search change history.

## Configuration

`propertyId` and `measurementId` are optional static defaults. When `propertyId` is configured, property-scoped tools can run without a `propertyId` input; otherwise use **List Accounts and Properties** to discover a GA4 property and pass its ID manually. When `measurementId` is configured, Measurement Protocol tools can run without a `measurementId` input; otherwise use **Manage Data Streams** to discover a web stream measurement ID. Measurement Protocol `apiSecret` must still be supplied by tool input or Measurement Protocol auth.

## Tools

### Audit Data Access

Generate a data access report to audit who accessed your analytics data and when. Shows which users and service accounts made data requests against the GA4 property. This helps with compliance and security monitoring by tracking API and UI data access patterns.

### Get Metadata

Retrieve the available dimensions and metrics for a GA4 property. Use this to discover which fields can be used in report queries, including both standard and custom dimensions/metrics. Returns the full catalog of available dimensions and metrics with their descriptions, types, and categories.

### List Accounts and Properties

List Google Analytics accounts accessible to the authenticated user and their GA4 properties. Useful for discovering available accounts and property IDs to use with other tools.

### Manage Audiences

List, create, update, or archive audiences on a GA4 property. Audiences are groups of users segmented by attributes or behaviors, used for targeted analysis and remarketing. Use **list** to see all audiences, **create** to define new audience segments, **update** to modify audience display name or description, and **archive** to remove them.

### Manage Custom Dimensions

List, create, update, or archive custom dimensions on a GA4 property. Custom dimensions allow you to track additional data points beyond the built-in dimensions. Use **list** to see all custom dimensions, **create** to add new ones, **update** to modify display names or descriptions, and **archive** to remove them.

### Manage Custom Metrics

List, create, update, or archive custom metrics on a GA4 property. Custom metrics allow you to track numerical data beyond the built-in metrics. Use **list** to see all custom metrics, **create** to add new ones, **update** to modify display names, descriptions, or measurement units, and **archive** to remove them.

### Manage Data Streams

List, get, create, update, or delete data streams on a GA4 property. Data streams represent sources of data flowing into GA4, such as websites (Web) or mobile apps (iOS/Android). Also supports listing and creating Measurement Protocol secrets for a specific data stream, and exposes web stream `measurementId` values for event tools.

### Manage Key Events

List, create, update, or delete key events (conversions) on a GA4 property. Key events mark specific user actions as valuable for your business (e.g., purchases, sign-ups, form submissions). Previously known as "conversion events" in Google Analytics.

### Run Funnel Report

Generate a funnel report to visualize the steps users take to complete a task. Shows how well users succeed or fail at each step in a multi-step process. Use this to analyze conversion funnels like checkout flows, onboarding sequences, or any multi-step user journey.

### Run Realtime Report

Query real-time analytics data showing current activity on a GA4 property. Shows data from the last 30 minutes. Common real-time dimensions: \

### Run Report

Query an analytics report from a GA4 property with configurable dimensions, metrics, date ranges, filters, and sorting. Supports up to 4 simultaneous date ranges and provides unsampled data. Common dimensions: \

### Send Events

Send event data to Google Analytics 4 via the Measurement Protocol. Use this to record server-side interactions, offline conversions, or events from non-web/app contexts (e.g., kiosks, POS systems, CRM triggers). Pass the selected stream `measurementId` and Measurement Protocol `apiSecret` directly, use configured `measurementId`, or use Measurement Protocol Only auth as a fallback. The Measurement Protocol supplements automatic data collection — it does not replace gtag, Tag Manager, or Firebase.

### Validate Events

Validate event data against the GA4 Measurement Protocol without actually sending the events. Use this to test event payloads for errors before sending them to production. Pass the selected stream `measurementId` and Measurement Protocol `apiSecret` directly, use configured `measurementId`, or use Measurement Protocol Only auth as a fallback. Returns validation messages indicating any issues with the event data format, parameter names, or values.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
