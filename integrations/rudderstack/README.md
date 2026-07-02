# <img src="https://provider-logos.metorial-cdn.com/rudderstack.png" height="20"> Rudderstack

Collect, route, and process customer event data across websites, apps, and servers. Send identify, track, page, screen, group, and alias events via HTTP API. Manage event transformations with custom JavaScript or Python functions. Create and enforce tracking plans to validate incoming event data. Access event audit data for data governance and schema inspection. Suppress users and delete collected data for GDPR/CCPA compliance. Run Reverse ETL syncs to route warehouse data back to business tools. Fetch enriched user profiles for real-time personalization via the Activation API. Test event transformation and delivery for source-destination setups. Manage data catalog events and properties. Access audit logs for security monitoring.

## Tools

### Get Audit Logs

Retrieve audit logs from RudderStack for security auditing. Tracks CRUD operations on sources, destinations, connections, and transformations. Supports filtering by workspace and date range.

### Get Event Audit

Retrieve event model information from RudderStack's Event Audit API for data governance. Returns metadata about all events and their schemas, payload versions, and data types flowing through your sources. Useful for diagnosing inconsistencies in event data.

### List Libraries

Retrieve all transformation libraries and optionally their version history. Libraries are reusable code modules shared across transformations.

### List Regulations

Retrieve all user suppression regulations created via the User Suppression API, or delete a specific regulation by its ID. Useful for reviewing compliance actions and managing existing regulations.

### List Tracking Plans

Retrieve all tracking plans in your workspace, or get the details of a specific tracking plan by ID. Tracking plans define schemas for validating incoming event data.

### List Transformations

Retrieve all transformations and optionally their version history. Use this to see all transformations in your workspace or to inspect the revision history of a specific transformation.

### Manage Library

Create, update, or delete a RudderStack transformation library. Libraries are reusable JavaScript or Python modules that can be imported and shared across multiple transformations. Supports creating new libraries, updating code/description, publishing, and deleting libraries.

### Manage Reverse ETL Sync

Trigger, stop, or check the status of a Reverse ETL sync. Reverse ETL routes customer data from your data warehouse to downstream destinations. Use this to programmatically orchestrate syncs, check sync progress, or halt running syncs.

### Manage Tracking Plan

Create, update, or delete a RudderStack tracking plan. Tracking plans monitor and validate incoming event data against predefined schemas, flagging violations like unplanned events or incorrect properties. Also supports upserting or removing events within a tracking plan.

### Manage Transformation

Create, update, or delete a RudderStack transformation. Transformations are custom JavaScript or Python functions that modify event payloads before they reach destinations. Supports creating new transformations, updating code/description, publishing, and deleting transformations.

### Publish Transformations

Publish one or more transformations and/or libraries in a single operation, making their latest revisions live for incoming event traffic. RudderStack runs validation tests before publishing to ensure no exceptions.

### Send Batch Events

Send multiple customer events to RudderStack in a single batch request. Each event in the batch includes a \

### Send Event

Send a customer event to RudderStack via the HTTP API. Supports all standard event types: **identify**, **track**, **page**, **screen**, **group**, and **alias**. Requires a Data Plane URL and Source Write Key to be configured. Use this tool for server-side event tracking, importing historical data, or programmatically sending events.

### Suppress User

Create a user suppression regulation in RudderStack for GDPR/CCPA compliance. Supports two modes: - **suppress**: Stops collecting data for specified users at the source level. - **suppress_with_delete**: Stops collecting data and deletes existing data from specified destinations.

### Test Event Delivery

Test event transformation and delivery for a given source or source-destination setup without using the Live Events tab. Verifies that events are correctly transformed and delivered through the pipeline.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
