# <img src="https://provider-logos.metorial-cdn.com/appcues.png" height="20"> Appcues

Manage in-app product adoption experiences including onboarding flows, tooltips, banners, checklists, and NPS surveys. Create, publish, and unpublish web flows, pins, banners, launchpads, checklists, and mobile experiences. Read, update, and delete end-user profiles and group profiles for targeting and personalization. Track custom user events and retrieve event history. Create, update, and manage user segments with bulk user ID uploads. Import user profiles, group profiles, and events in bulk via CSV or JSON. Export event data with flexible filtering by flow, checklist, NPS, segment, or custom attributes. Configure ingestion filtering rules to control which attributes and events are stored. Manage SDK authentication keys for identity verification. Receive real-time webhook events for NPS interactions, flow completions, checklist progress, banner dismissals, email delivery, and push notifications.

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

List all experiences in your Appcues account. Supports filtering by experience type to retrieve flows, pins, banners, launchpads, checklists, mobile experiences, NPS surveys, or embeds. Returns key metadata including publish status, name, and tags.

### List Tags

List all tags used to organize experiences in your Appcues account. Tags can be used to filter and categorize flows, checklists, and other experience types.

### Get Group Profile

Retrieve a group (account/company) profile from Appcues. Group properties are used for targeting experiences at the group level.

### List Segments

List all user segments in your Appcues account. Segments are used to group users for targeted experience delivery.

### Publish Experience

Publish or unpublish an Appcues experience. Supports all experience types: flows, pins, banners, launchpads, checklists, mobile experiences, NPS surveys, and embeds. Publishing makes the experience visible to users; unpublishing hides it.

### Track User Event

Track a custom event for a user in Appcues. Events are immediately available for flow targeting but take several minutes to appear in analytics/insights. Can include optional attributes and group association.

### Update User Profile

Update profile properties for an end-user in Appcues. Properties are applied synchronously and immediately available for flow targeting and personalization. Pass key-value pairs to set or update.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
