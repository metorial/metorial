# <img src="https://provider-logos.metorial-cdn.com/appcues.png" height="20"> Appcues

Manage Appcues in-app experiences, including web flows, Flow 2.0, pins, banners, launchpads, checklists, mobile experiences, NPS surveys, and embeds. Read experience details and publish or unpublish experiences. Read, update, and delete end-user profiles; track custom events and retrieve event history. Read and update group profiles and associate users with groups. Create, inspect, update, and delete user segments; manage segment membership and initiate event or membership exports. Discover recent asynchronous jobs and inspect their progress.

## Tools

### Delete User Profile

Delete an end-user's profile from Appcues. This resets their experience state (re-enables one-time flows, resets checklist progress) but does **not** remove analytics data. The operation is processed asynchronously.

### Export Events

Export event data from Appcues matching specified conditions and time ranges. Supports filtering by flow, checklist, NPS, segment, event name, and custom attributes. The export is processed asynchronously — use the "Get Job Status" tool to track progress.

### Get Experience

Retrieve detailed information about a specific Appcues experience by its ID and type. Returns full metadata including name, publish status, frequency, steps, and tags.

### Get Job Status

Check the status of an asynchronous job in Appcues. Many operations like bulk imports, exports, segment membership changes, and user deletions are processed asynchronously and return a job ID. Use this tool to monitor job progress and completion.

### Get User Events

Retrieve recent event history for a specific user in Appcues. Returns events with their names, timestamps, and attributes. Supports limiting the number of results and specifying a time zone.

### Get User Profile

Retrieve an end-user's profile from Appcues. Returns all stored profile properties for the user, which are used for experience targeting and personalization.

### List Experiences

List all experiences in your Appcues account. Supports filtering by experience type to retrieve flows (including Flow 2.0), pins, banners, launchpads, checklists, mobile experiences, NPS surveys, or embeds. Returns key metadata including publish status, name, and tags.

### List Tags

List all tags used to organize experiences in your Appcues account. Tags can be used to filter and categorize flows, checklists, and other experience types.

### Get Group Profile

Retrieve a group (account/company) profile from Appcues. Group properties are used for targeting experiences at the group level.

### List Segments

List all user segments in your Appcues account. Segments are used to group users for targeted experience delivery.

### Publish Experience

Publish or unpublish an Appcues experience. Supports all experience types: flows (including Flow 2.0), pins, banners, launchpads, checklists, mobile experiences, NPS surveys, and embeds. Publishing makes the experience visible to users; unpublishing hides it.

### Track User Event

Track a custom event for a user in Appcues. Events are immediately available for flow targeting but take several minutes to appear in analytics/insights. Can include optional attributes and group association.

### Update User Profile

Update profile properties for an end-user in Appcues. Properties are applied synchronously and immediately available for flow targeting and personalization. Pass key-value pairs to set or update.

### Get Segment

Retrieve a segment's name, description, and creation and update information. Use List Segments to discover segment IDs.

### List Jobs

Discover recent asynchronous jobs and their IDs, names, status, and start time. Use Get Job Status to inspect detailed progress.

### Create Segment

Create a user segment that can be populated using Manage Segment Members.

### Update Segment

Update a segment's name or description.

### Delete Segment

Permanently delete a user segment.

### Manage Segment Members

Add or remove user IDs in bulk, or initiate an asynchronous segment membership export.

### Update Group Profile

Update group properties or associate users with a group.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
