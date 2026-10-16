# <img src="https://provider-logos.metorial-cdn.com/heap.png" height="20"> Heap

Track custom events, link anonymous users to known identities, and enrich user and account profiles. Supports single and bulk ingestion, asynchronous privacy deletion requests, and deletion status checks.

## Tools

### Delete User

Submit one user or up to 10,000 users for asynchronous deletion across the account. Returns a request ID and status; `deleted` is true only after Heap reports completion. Requires the Main Production environment App ID and API Key.

### Get Deletion Status

Check the status of a request returned by Delete User to confirm completion.

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
