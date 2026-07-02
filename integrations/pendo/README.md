# <img src="https://provider-logos.metorial-cdn.com/pendo.png" height="20"> Pendo

Manage Pendo product analytics data, in-app guidance metadata, segments, reports, and server-side track events. Retrieve visitor and account records, update custom metadata, list and inspect guides, pages, features, and track types, manage API-created segments, query aggregated product usage data, monitor bulk deletion requests, and receive real-time webhook notifications for guide, track, NPS, poll, visitor, and account events.

## Tools

### Bulk Delete Visitors or Accounts

Permanently delete visitor or account records from Pendo in bulk. All events associated with the specified IDs will be deleted. Deletion is processed in batches and may take up to 21 days for GDPR compliance.

### Create Segment

Create a new API-managed segment in Pendo from a list of visitor IDs. Segments are created instantly, but adding visitors is processed asynchronously.

### Delete Segment

Delete a segment from Pendo by segment ID. This permanently removes the segment definition. Requires an integration key with write access.

### Get Bulk Delete Status

List outstanding Pendo bulk deletion requests or retrieve the preserved status receipt for a specific deletion request ID.

### Get Account

Retrieve an account record from Pendo by account ID. Returns account metadata including custom fields, first and last visit timestamps, and associated visitor information.

### Get Feature

Retrieve a specific tagged feature from Pendo by feature ID. Returns the feature name and raw feature configuration.

### Get Guide

Retrieve a specific guide from Pendo by ID. Returns full guide configuration including steps, targeting rules, launch method, and deployment status.

### Get Metadata Schema

Retrieve the metadata schema for visitors or accounts in Pendo. Shows all configured metadata fields (both auto and custom), their types, and configuration. Useful for understanding available fields before running aggregations or updating metadata.

### Get Page

Retrieve a specific tagged page from Pendo by page ID. Returns the page name, rules, and raw page configuration.

### Get Report

Retrieve results from a Pendo visitor or account report by report ID. JSON results are returned inline; CSV results are returned as a Slate attachment.

### Get Segment Visitor Export

Check the status of a Pendo segment visitor export job or retrieve completed CSV export results as a Slate attachment.

### Get Track Type

Retrieve a specific Pendo track event type by track type ID.

### Get Visitor

Retrieve a visitor record from Pendo by visitor ID. Returns visitor metadata including custom fields, first and last visit timestamps, and associated account information.

### List Features

List all tagged features in Pendo. Returns feature names, IDs, and click selectors. Optionally filter by application ID for multi-app subscriptions.

### List Guides

List all guides in Pendo. Returns guide names, IDs, deployment status, and step details. Optionally filter by application ID for multi-app subscriptions.

### List Pages

List all tagged pages in Pendo. Returns page names, IDs, and URL rules. Optionally filter by application ID for multi-app subscriptions.

### List Reports

List public Pendo visitor and account reports available through the API. Use this to discover report IDs before calling Get Report.

### List Segments

List all segments defined in Pendo. Returns segment names, IDs, and types. Segments are used to group visitors and accounts for analytics filtering and guide targeting.

### List Track Types

List custom track event types known to Pendo. Optionally filter by application ID or expand across all applications in a multi-app subscription.

### Patch Segment Visitors

Add or remove small batches of visitors from an API-managed Pendo segment. Pendo limits each patch call to 10 operations and 1000 total visitors.

### Run Aggregation

Execute an aggregation query against Pendo's analytics data. Aggregations use a MongoDB-like pipeline to query data sources such as page events, feature events, guide events, poll responses, and track events. Common data sources: **visitors**, **pageEvents**, **featureEvents**, **guideEvents**, **guidesSeen**, **pollsSeen**, **pollEvents**, **trackEvents**, **events**. Pipeline steps include **source** (required first step), **filter**, **group**, **sort**, **limit**, **select**, **bulkExpand**, and **identified**.

### Send Track Event

Send a server-side Track Event to Pendo for an action that is not captured automatically by the Pendo agent. Requires the app-specific Track Event shared secret, which is different from the Engage integration key.

### Start Segment Visitor Export

Start an asynchronous export of visitors in a Pendo segment. Use Get Segment Visitor Export with the returned job ID to check status and retrieve CSV results.

### Update Account Metadata

Create or update custom metadata fields on an account record in Pendo. If the account does not exist, a new account record will be created with the provided metadata. Custom metadata fields will be automatically created if they don't exist.

### Update Segment

Update an API-managed Pendo segment's name or visitor list. Pendo only allows this for segments created through the API.

### Update Visitor Metadata

Create or update custom metadata fields on a visitor record in Pendo. If the visitor does not exist, a new visitor record will be created with the provided metadata. Custom metadata fields will be automatically created if they don't exist.

### Verify Integration Key

Verify the configured Pendo integration key and return Pendo's key capability details, including write access when provided by the API.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
