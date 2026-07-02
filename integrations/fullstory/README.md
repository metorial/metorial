# <img src="https://provider-logos.metorial-cdn.com/fullstory.png" height="20"> Fullstory

Manage user profiles, capture custom events, and retrieve session replay data for digital experience analytics. Create and update users, send server-side events, look up session replay URLs, export behavioral data, retrieve segment information, add session annotations, audit privacy and recording settings, and manage webhook endpoints for real-time event delivery.

## Tools

### Create Annotation

Add an annotation to FullStory. Annotations appear on metric visualizations and are useful for marking deployments, incidents, A/B test starts, or other notable events. Commonly used in CI/CD pipelines.

### Create Event

Send a custom server-side event to FullStory. Events enrich session data with business context such as backend transactions, loyalty status changes, or support tickets. Events are associated with a user and become searchable in FullStory.

### Create or Update User

Create a new user or update an existing user in FullStory. This is an upsert operation: if a user with the given **uid** already exists, their profile will be updated; otherwise a new user is created. Attach custom properties to enrich user profiles for segmentation and analysis.

### Delete User

Delete a user from FullStory by their uid. This is an asynchronous operation that returns an operation ID for tracking the deletion status.

### Export Segment

Start an export of segment data from FullStory. Exports can include individual user data or event data in CSV, JSON, or NDJSON format. Returns an operation ID that can be used to track the export progress.

### Get Operation Status

Check the status of an asynchronous FullStory operation such as user deletion or segment export. If the operation is a completed export, also retrieves the download URL for the results.

### Get Segment

Retrieve details of a specific FullStory segment by its ID. Returns the segment name, creator, creation date, and URL.

### Get User

Retrieve a user's profile from FullStory by their FullStory user ID. Returns the full user profile including custom properties and the link to view them in FullStory.

### List Segments

List saved user segments in FullStory. Segments are saved groups of users defined by user and event filters. Optionally filter by the segment creator's email.

### List Sessions

Retrieve a list of recorded sessions for a user. Lookup by uid or email address. Returns session replay URLs that can be embedded in support tools or other applications.

### List Users

Search and list users in FullStory. Filter by uid, email, display name, or identification status. Results are paginated.

### List Webhook Endpoints

List all configured webhook endpoints in FullStory. Shows each endpoint's URL, subscribed event types, and enabled status.

### Manage Webhook Endpoint

Create, update, or delete a webhook endpoint in FullStory. Webhook endpoints receive notifications for system events such as notes, segments, custom events, and metric alerts. **To create**: provide url and eventTypes. **To update**: provide endpointId along with any fields to change. **To delete**: provide endpointId and set deleteEndpoint to true.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
