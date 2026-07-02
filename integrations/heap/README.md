# <img src="https://provider-logos.metorial-cdn.com/heap.png" height="20"> Heap

Track custom events, manage user identities, and enrich analytics data server-side. Send individual or bulk custom events with properties, attach user-level and account-level properties, identify and merge user profiles across sessions and devices, delete users for privacy compliance (GDPR/CCPA), and sync user segment membership to external systems via webhooks. Supports event-based webhooks and periodic segment sync callbacks for data export.

## Tools

### Delete User

Delete a user and all their data from your Heap workspace. This checks all environments in your account for a matching user and removes their records. Primarily used for data privacy compliance (GDPR, CCPA). The user is looked up and then deleted via Heap's SCIM API.

### Identify User

Link an anonymous Heap user ID to a known identity (e.g., email address), merging their activity history into a single user profile. This enables cross-session, cross-device, and cross-browser user tracking under one unified profile.

### Manage Account Properties

Attach custom properties to accounts in Heap for B2B analytics. Supports both single account and bulk updates (up to 1000 accounts per request). Use this to associate attributes like company name, plan tier, industry, or revenue potential with groups of users. Requires Account ID to be configured in your Heap project settings before use.

### Manage User Properties

Attach custom properties to user profiles in Heap. Supports both single user and bulk updates (up to 1000 users per request). Use this to enrich user profiles with data from your database, demographic info, or other attributes not automatically captured by Heap. Properties can be set without an existing session, making this ideal for backfilling historical data.

### Track Event

Send custom server-side events to Heap. Supports both single event tracking and bulk event ingestion (up to 1000 events per request). Use this for events that need to exactly match your backend data, such as completed transactions, or events not available for client-side capture.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
