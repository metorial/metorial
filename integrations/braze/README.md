# <img src="https://provider-logos.metorial-cdn.com/braze.png" height="20"> Braze

Track and manage user profiles with attributes, custom events, and purchases. Send personalized messages across email, push notifications, in-app messages, SMS, Content Cards, and webhooks. Trigger and schedule campaigns and multi-step Canvas journeys programmatically. Export campaign and Canvas analytics, KPIs, and user data. Manage audience segments, subscription groups, catalogs, email templates, content blocks, and preference centers. Handle email blocklists, hard bounces, and invalid phone numbers. Upload media assets and provision dashboard users via SCIM. Stream real-time message engagement and customer behavior events through Currents.

## Tools

### Export Users

Export user profiles from Braze by identifiers (external IDs, Braze IDs, emails, phone numbers, or user aliases). Returns full user profile data including attributes, custom events summary, purchases, and device info. Optionally filter which fields to export.

### Get KPI Analytics

Retrieve key performance indicator (KPI) time series data from Braze. Supports daily active users (DAU), monthly active users (MAU), new users, and session counts over a specified time period.

### List Campaigns

Retrieve a list of campaigns from Braze with their names, IDs, and tags. Supports pagination and filtering by last edit time. Use the campaign ID to fetch details or trigger API-triggered campaigns.

### List Canvases

Retrieve a list of Canvases (multi-step journeys) from Braze with their names, IDs, and tags. Supports pagination and filtering by last edit time.

### List Segments

Retrieve a list of audience segments from Braze. Returns segment names, IDs, and analytics tracking status. Use the segment ID to get details or export users within a segment.

### List Catalogs

List all product catalogs in your Braze workspace. Returns catalog names, descriptions, and field definitions.

### Manage Email Blocklist

Query and manage Braze email blocklists. List hard bounced or unsubscribed email addresses, and remove emails from the bounce or spam lists to re-enable delivery.

### Update Subscription Status

Update user subscription states for email or SMS subscription groups. Add or remove users from a subscription group by setting their state to subscribed or unsubscribed.

### Manage Email Templates

Create, retrieve, update, or list email templates in Braze. Templates define reusable email content that can be used across campaigns and Canvases.

### Delete Users

Permanently delete user profiles from Braze by external IDs, Braze IDs, or user aliases. This is irreversible and will remove all data associated with the user profiles.

### Schedule Message

Schedule a message for future delivery or cancel an existing scheduled message. Allows you to set up one-off message sends at a specific time, optionally in each user's local timezone.

### Send Message

Send messages immediately across channels (email, push, SMS, webhook, Content Cards) to specified users. Supports direct one-off sends to user IDs. For API-triggered campaigns or Canvases, use the dedicated trigger tools instead.

### Track Users

Record user attributes, custom events, and purchases to Braze user profiles. Supports batch operations with up to 75 attributes, 75 events, and 75 purchases per call. Users are identified by external ID, Braze ID, user alias, email, or phone.

### Trigger Campaign

Trigger an API-triggered campaign in Braze. Sends the campaign to specified recipients with optional personalization via trigger properties and user attributes. The campaign must be configured for API-triggered delivery in the Braze dashboard.

### Trigger Canvas

Trigger an API-triggered Canvas (multi-step journey) in Braze. Sends users into a Canvas flow with optional entry properties. The Canvas must be configured for API-triggered delivery in the Braze dashboard.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
