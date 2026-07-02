# <img src="https://provider-logos.metorial-cdn.com/iterable.png" height="20"> Iterable

Manage cross-channel marketing automation across email, push notifications, SMS, in-app messages, web push, and WhatsApp. Create, update, and delete user profiles, track custom and commerce events, and manage subscription preferences. Create and manage campaigns (blast or triggered) and message templates with Handlebars personalization. Organize users into lists for audience targeting. Send transactional messages to individual users via API-triggered campaigns with dynamic data fields. Create and manage catalogs of items for template personalization. Create, update, and delete reusable content snippets for embedding in templates. Export user data, event data, and campaign metrics as CSV. Manage messaging channels and message types. Receive real-time webhook notifications for email, push, SMS, in-app, web push, WhatsApp, subscription, journey, and embedded messaging events.

## Tools

### Delete User

Permanently deletes a user profile from the Iterable project. This is a destructive operation and cannot be undone. Use for GDPR compliance or data cleanup.

### Export Data

Exports user data, event data, or campaign metrics from Iterable as CSV. Supports exporting by data type and date range. Also supports exporting a specific user's events.

### Get Channels and Message Types

Retrieves all messaging channels and message types configured in the Iterable project. Channels represent communication pathways (email, push, SMS, etc.) and message types control how subscription preferences are organized.

### Get User

Retrieves a user profile from Iterable by **email** or **userId**. Returns the full user profile including all custom data fields and subscription preferences.

### Manage Campaigns

List existing campaigns, create new blast campaigns, or retrieve campaign metrics. Campaigns can target email, push, SMS, in-app, and web push channels.

### Manage Catalogs

Create, list, or delete catalogs and their items in Iterable. Catalogs store collections of items (e.g. products) that can be referenced in templates for personalization. Supports bulk uploading up to 1,000 items at a time.

### Manage Lists

Create, delete, or retrieve lists in Iterable. Lists are used to organize users into segments for campaign targeting and journey entry. Also supports subscribing and unsubscribing users to/from lists.

### Manage Snippets

Create, update, list, or delete snippets in Iterable. Snippets are reusable content blocks that can be embedded in templates using Handlebars syntax.

### Manage Templates

List, retrieve, or update message templates across all channels (email, push, SMS, in-app). Templates use Handlebars-based personalization with user profile and event data.

### Send Message

Sends a targeted message to an individual user via an API-triggered campaign. Supports **email**, **push notification**, **SMS**, **in-app**, and **web push** channels. Pass dynamic data fields for template personalization at send time.

### Track Event

Tracks a custom event for a user in Iterable. Events can trigger journeys, campaigns, and can be used for segmentation. Optionally attribute the event to a specific campaign or template.

### Track Purchase

Records a purchase event for a user in Iterable. Tracks commerce items with prices, quantities, and custom metadata. Unlocks commerce-specific campaign metrics and segmentation.

### Update Cart

Updates the shopping cart for a user in Iterable. Replaces the user's current cart contents with the provided items. Used for cart abandonment campaigns and commerce workflows.

### Update Subscriptions

Updates a user's subscription preferences in Iterable. Manage which email lists, channels, and message types a user is subscribed to or has opted out of.

### Create or Update User

Creates a new user or updates an existing user profile in Iterable. Identify the user by **email** and/or **userId**. Attach custom data fields to the profile for personalization in campaigns and journeys.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
