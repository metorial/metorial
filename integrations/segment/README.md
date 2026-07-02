# <img src="https://provider-logos.metorial-cdn.com/segment.png" height="20"> Segment

Collect, unify, and route customer event data across tools and platforms. Track user actions (identify, track, page, screen, group, alias) via the Tracking API. Manage workspace resources including sources, destinations, warehouses, tracking plans, functions, and reverse ETL models via the Public API. Create and enforce event schemas with tracking plans. Configure destination filters to control event routing. Build audiences and computed traits based on user behavior. Create custom JavaScript functions for source, destination, or middleware logic. Monitor API usage, event delivery metrics, and monthly tracked users. Handle GDPR deletion and suppression requests. Browse the integration catalog and manage identity, access, and roles for workspace users. Forward events to external webhooks in real time.

## Tools

### Alias User

Send an Alias call to Segment's Tracking API. Merges two user identities by linking a previousId to a new userId. Useful when an anonymous user signs up and you want to combine their pre- and post-signup activity. Requires a write key.

### Batch Events

Send a batch of Identify, Track, Page, Screen, Group, or Alias calls in a single request to Segment's Tracking API. More efficient than individual calls for high-volume data import. Requires a write key.

### Browse Catalog

Browse the Segment integration catalog to discover available source, destination, and warehouse types. Returns metadata IDs needed when creating new sources, destinations, or warehouses.

### Create Data Regulation

Create a GDPR deletion or suppression request. Submits a regulation to delete or suppress user data across sources or the entire workspace. Can also list existing regulation requests.

### Get Source

Retrieve detailed information about a specific source, including its connected destinations and warehouses.

### Get Usage Metrics

Query workspace-level API call usage, monthly tracked users (MTU), and delivery metrics. Useful for monitoring consumption and identifying sources of high event volume.

### Group User

Send a Group call to Segment's Tracking API. Associates a user with a group (company, organization, account, team) and records group traits. Requires a write key.

### Identify User

Send an Identify call to Segment's Tracking API. Ties a user to their traits like email, name, and plan. Requires a write key.

### List Audit Events

List audit trail events for the workspace. Audit events record actions like source creation, destination updates, user invitations, and other workspace changes.

### List Destinations

List all configured destinations in the Segment workspace. Returns destination details including name, enabled status, source connection, and metadata.

### List Sources

List all data sources in the Segment workspace. Returns source details including name, slug, enabled status, write keys, and connected destinations/warehouses metadata.

### List Tracking Plans

List all tracking plans in the workspace. Optionally retrieve the rules and connected sources for a specific tracking plan.

### List Warehouses

List all data warehouses in the workspace, optionally with connected sources and connection state for a specific warehouse.

### Manage Destination Filter

Create, update, or remove filters on a destination. Destination filters control which events are forwarded, allowing you to drop events, sample a percentage, or strip specific properties before delivery.

### Manage Destination

Create, update, or delete a destination in your Segment workspace. Destinations are analytics tools, marketing platforms, or data warehouses where Segment routes collected data. To create a new destination, provide the **sourceId** and **metadataId** (from the catalog). To update or delete, provide the **destinationId**.

### Manage Function

Create, update, list, or delete custom JavaScript functions. Functions run within Segment's infrastructure and can act as sources, destinations, or insert middleware to transform events.

### Manage Reverse ETL Model

Create, update, list, or delete reverse ETL models. Reverse ETL models define SQL queries against your warehouse and sync results back to downstream destinations on a schedule.

### Manage Source

Create, update, or delete a data source in your Segment workspace. Sources represent websites, mobile apps, servers, or cloud services that send data into Segment. To create a new source, provide the **metadataId** (from the catalog) and a **slug**. To update or delete, provide the **sourceId**.

### Manage Tracking Plan

Create, update, delete, or connect tracking plans. Tracking plans define expected event schemas and validate incoming data against those schemas. Violations generate when events don't match the spec.

### Manage Transformation

Create, update, list, or delete event transformations. Transformations modify events in-flight (rename events, rename properties, add computed properties) before they reach destinations.

### Manage Warehouse

Create, update, delete, or manage source connections for data warehouses. Warehouses like BigQuery, Snowflake, and Redshift receive synced data from Segment sources.

### Record Page or Screen View

Send a Page or Screen call to Segment's Tracking API. Records a page view (web) or screen view (mobile) with optional properties. Requires a write key.

### Track Event

Send a Track event to Segment's Tracking API. Records a user action or event with optional properties. Requires a write key to be configured in authentication.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
