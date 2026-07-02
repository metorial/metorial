# <img src="https://provider-logos.metorial-cdn.com/klaviyo.svg" height="20"> Klaviyo

Manage email, SMS, and push notification marketing campaigns for eCommerce. Create and update customer profiles, manage lists and segments, build automated messaging flows, track events, and query performance reports. Supports product catalog management for recommendations and back-in-stock alerts, coupon creation, email template design, form management, and audience segmentation based on behavioral and predictive data. Subscribe and unsubscribe profiles from marketing channels, request data privacy deletions, and configure webhooks for real-time event forwarding.

## Tools

### Create or Update Profile

Create a new customer profile or update an existing one in Klaviyo. When a profileId is provided, the existing profile will be updated. Otherwise a new profile is created. Supports setting email, phone, name, location, and custom properties.

### Get Events

Retrieve events (actions tracked for profiles) from Klaviyo. Filter by metric, profile, timestamp, or other attributes. Events include email opens, clicks, purchases, and any custom events.

### Get Flows

Retrieve automation flows from Klaviyo. Flows are automated messaging workflows triggered by events, list membership, or dates. Can fetch a specific flow by ID or list all flows. Optionally include flow actions.

### Get List or Segment Profiles

Retrieve profiles belonging to a specific list or segment in Klaviyo. Supports filtering and pagination. Use this to see who is in a particular audience.

### Get Metrics

Retrieve available metrics (event types) from Klaviyo. Metrics include built-in types like "Opened Email", "Placed Order", and any custom events. Use metrics to understand what event types are available for querying aggregates or filtering events.

### Get Profiles

Search and retrieve customer profiles from Klaviyo. Supports filtering by email, phone number, external ID, and custom properties using Klaviyo's filter syntax. Use pagination to iterate through large result sets.

### Get Segments

Retrieve segments from Klaviyo. Segments are dynamic groups of profiles based on conditions such as behavior, engagement, location, or predictive analytics. Can fetch a single segment by ID or list all segments with optional filtering.

### Manage Campaigns

Create, retrieve, update, delete, or send email/SMS/push campaigns in Klaviyo. Campaigns target lists and/or segments with marketing messages. Use this to manage the full campaign lifecycle.

### Manage Catalog Items

Create, retrieve, update, or delete product catalog items in Klaviyo. Catalog items power product recommendations, back-in-stock notifications, price-drop flows, and dynamic template content. Also supports listing item variants and browsing categories.

### Manage Coupons

Create and retrieve coupons in Klaviyo, and bulk-create coupon codes. Coupons are used in campaigns and flows to offer discounts.

### Manage Lists

Create, update, delete, or retrieve lists in Klaviyo. Also supports adding and removing profiles from lists. Lists are static collections of profiles used for campaign targeting.

### Manage Subscriptions

Subscribe or unsubscribe profiles to/from email and SMS marketing for a specific list. Can also suppress or unsuppress profiles globally. Use this tool to manage consent and marketing opt-in/opt-out.

### Manage Tags

Create, retrieve, update, or delete tags and tag groups in Klaviyo. Tags are used to organize campaigns, flows, lists, and segments for easier filtering and management.

### Manage Templates

Create, retrieve, update, delete, clone, or render email templates in Klaviyo. Templates are used in campaigns and flows for composing email content. Supports HTML and drag-and-drop editor types.

### Query Metric Aggregates

Query aggregate analytics data for a specific metric in Klaviyo. Returns computed measurements like count, sum, or unique values over a time period. Useful for building reports on email opens, revenue, clicks, conversions, and other performance metrics.

### Request Profile Deletion

Submit a data privacy deletion request for a profile in Klaviyo. Used for GDPR right-to-erasure and similar privacy compliance. The profile and all associated data will be permanently deleted.

### Track Event

Create a custom event in Klaviyo associated with a profile. Events can trigger flows, contribute to segments, and appear in analytics. Common use cases: tracking purchases, form submissions, quiz completions, password resets, and other custom actions.

### Update Flow Status

Change the status of an automation flow in Klaviyo. Flows can be set to draft, manual, or live status.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
