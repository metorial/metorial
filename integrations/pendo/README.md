# <img src="https://provider-logos.metorial-cdn.com/pendo.png" height="20"> Pendo

Manage product analytics data, in-app guidance, and user feedback. Retrieve, create, and update visitor and account records with custom metadata. Create and manage in-app guides (tooltips, modals, walkthroughs) and segments for targeting users. Query aggregated product usage data including page events, feature events, guide interactions, poll responses, and track events using a flexible aggregation pipeline. Send custom track events from client-side and server-side sources. Manage legacy feedback requests and product roadmap data. Receive real-time webhook notifications for events like guide displays, NPS surveys, poll submissions, visitor creation, and account creation.

## Tools

### Bulk Delete Visitors or Accounts

Permanently delete visitor or account records from Pendo in bulk. All events associated with the specified IDs will be deleted. Deletion is processed in batches and may take up to 21 days for GDPR compliance.

### Create Segment

Create a new segment in Pendo from a list of visitor or account IDs. Segments created via API are processed asynchronously — visitors are added in batches after the segment is created.

### Delete Segment

Delete a segment from Pendo by segment ID. This permanently removes the segment definition. Requires an integration key with write access.

### Get Account

Retrieve an account record from Pendo by account ID. Returns account metadata including custom fields, first and last visit timestamps, and associated visitor information.

### Get Guide

Retrieve a specific guide from Pendo by ID. Returns full guide configuration including steps, targeting rules, launch method, and deployment status.

### Get Metadata Schema

Retrieve the metadata schema for visitors or accounts in Pendo. Shows all configured metadata fields (both auto and custom), their types, and configuration. Useful for understanding available fields before running aggregations or updating metadata.

### Get Report

Retrieve results from a Pendo visitor or account report by report ID. Only visitor and account reports are available via the API — paths, funnels, workflows, retention, and Data Explorer reports are not supported.

### Get Visitor

Retrieve a visitor record from Pendo by visitor ID. Returns visitor metadata including custom fields, first and last visit timestamps, and associated account information.

### List Features

List all tagged features in Pendo. Returns feature names, IDs, and click selectors. Optionally filter by application ID for multi-app subscriptions.

### List Guides

List all guides in Pendo. Returns guide names, IDs, deployment status, and step details. Optionally filter by application ID for multi-app subscriptions.

### List Pages

List all tagged pages in Pendo. Returns page names, IDs, and URL rules. Optionally filter by application ID for multi-app subscriptions.

### List Segments

List all segments defined in Pendo. Returns segment names, IDs, and types. Segments are used to group visitors and accounts for analytics filtering and guide targeting.

### Run Aggregation

Execute an aggregation query against Pendo's analytics data. Aggregations use a MongoDB-like pipeline to query data sources such as page events, feature events, guide events, poll responses, and track events. Common data sources: **visitors**, **pageEvents**, **featureEvents**, **guideEvents**, **guidesSeen**, **pollsSeen**, **pollEvents**, **trackEvents**, **events**. Pipeline steps include **source** (required first step), **filter**, **group**, **sort**, **limit**, **select**, **bulkExpand**, and **identified**.

### Update Account Metadata

Create or update custom metadata fields on an account record in Pendo. If the account does not exist, a new account record will be created with the provided metadata. Custom metadata fields will be automatically created if they don't exist.

### Update Visitor Metadata

Create or update custom metadata fields on a visitor record in Pendo. If the visitor does not exist, a new visitor record will be created with the provided metadata. Custom metadata fields will be automatically created if they don't exist.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
