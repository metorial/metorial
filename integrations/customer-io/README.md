# <img src="https://provider-logos.metorial-cdn.com/customerio-logo.svg" height="20"> Customerio

Track customer behavior and attributes, send targeted messages (email, SMS, push, in-app, Slack), and manage marketing automation workflows. Create and update people profiles, track events and page views, manage segments, trigger transactional messages and broadcasts, manage objects and relationships, handle collections of reusable data, register devices for push notifications, and bulk import/export people data. Receive real-time reporting webhooks for message activity events like sends, opens, clicks, and bounces.

## Tools

### Delete Person

Delete a person from your Customer.io workspace. This removes the person and their data, but does not suppress them — they can be re-added later. Use the suppress action if you want to prevent the person from being re-added.

### Get Campaign

Retrieve detailed information about a specific campaign, including its actions, metrics, and configuration. Optionally fetch campaign metrics with configurable time periods.

### Get Person

Look up a person in your Customer.io workspace and retrieve their attributes, segments, and recent activity. You can look up a person by their ID, email, or cio_id.

### Get Segment Membership

Retrieve the people who belong to a specific segment. Returns a paginated list of customer IDs in the segment.

### List Campaigns

Retrieve campaigns from your Customer.io workspace. Returns information about campaigns including their names, states, types, and tags.

### List Collections

Retrieve all collections in your Customer.io workspace. Collections are sets of reusable data (promotions, events, courses, etc.) that you reference in campaigns with Liquid templates.

### List Segments

Retrieve all segments in your Customer.io workspace. Segments are named groups of people who share characteristics or behaviors. Returns both data-driven and manual segments.

### Manage Collection

Create, update, or delete a collection in your Customer.io workspace. Collections store reusable data (promotions, events, courses, etc.) that you can reference in campaigns with Liquid. You can provide data as JSON or point to a URL for CSV/JSON data.

### Manage Device

Register or remove a device for push notifications associated with a person. Use this to add mobile devices (iOS/Android) to a person for push notification targeting, or to remove a device when a user logs out or opts out.

### Manage Manual Segment

Add or remove people from a manual segment. Manual segments are static groups that you manage explicitly, unlike data-driven segments that update automatically based on criteria.

### Merge People

Merge two person profiles into one. The secondary person's data is consolidated into the primary person's profile, and the secondary profile is removed. Use this to consolidate duplicate profiles.

### Search People

Search for people in your Customer.io workspace using complex filters. Find people by segment membership, attribute values, or other criteria. Returns up to 1000 people per request.

### Send Transactional Message

Send a transactional message (email, push notification, or SMS) to a person. Transactional messages are for receipts, password resets, order confirmations, and other messages your audience implicitly expects to receive. You can reference a pre-built template by its transactional message ID, or provide the full message content inline.

### Suppress or Unsuppress Person

Suppress or unsuppress a person in your Customer.io workspace. Suppressing a person removes them and prevents them from being re-added. Unsuppressing allows a previously suppressed person to be added back.

### Track Event

Track a custom event for a person or an anonymous event. Events represent actions people perform — button clicks, purchases, page views, etc. You can use events to trigger campaigns and segment users. Supports tracking events attributed to a specific person, anonymous events (associated later), and page/screen views.

### Trigger Broadcast

Trigger an API-triggered broadcast to send messages to a wide audience. You set up the broadcast in the Customer.io UI and then trigger it via this action. Broadcasts are ideal for announcements, product launches, event notifications, etc. You can target a segment, a list of customer IDs, or a list of email addresses.

### Create or Update Person

Create a new person or update an existing person in your Customer.io workspace. If no person exists with the given identifier, a new person is created. If a person already exists, their attributes are updated. You can set any custom attributes on the person, including email, name, plan, and any other key-value pairs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
