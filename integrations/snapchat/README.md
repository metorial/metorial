# <img src="https://provider-logos.metorial-cdn.com/snapchat.png" height="20"> Snapchat

Manage Snapchat advertising campaigns, creatives, audiences, reporting, and conversion events. Create and update the core ad hierarchy including organizations, ad accounts, campaigns, ad squads, and ads. Create media containers, build ad creatives, manage customer audience segments, estimate audience size and bid ranges, pull campaign performance reports, send or validate Conversions API events, and read funding sources and Snap Pixels.

## Tools

### Add Users to Segment

Add users to a Snapchat custom audience segment using hashed identifiers. Supports SHA-256 hashed email addresses, phone numbers, and mobile advertiser IDs. Identifiers must be pre-hashed before submission.

### Create Media

Create a new media object in a Snapchat ad account. Media objects are containers for images and videos used in ad creatives. After creating the media object, upload the actual media file separately.

### Delete Campaign

Permanently delete a Snapchat campaign by ID. This action cannot be undone — all associated ad squads and ads under the campaign will also be removed.

### Get Campaign Stats

Pull performance statistics for a Snapchat campaign, ad squad, ad, or ad account. Retrieve metrics such as impressions, swipe-ups, spend, conversions, and more with configurable granularity and time range.

### Get Audience Size

Estimate Snapchat reach for an existing ad squad or a prospective ad squad spec before launch. Use this to validate targeting breadth and budget planning.

### Get Bid Estimate

Retrieve Snapchat bid estimate ranges for an existing ad squad or for a prospective targeting spec. Use this before creating or adjusting ad squads to choose realistic bids.

### Get Funding Sources

List all funding sources for a Snapchat organization. Returns payment methods, credit lines, and their available balances.

### List Ad Accounts

List all ad accounts under a Snapchat organization. Returns account IDs, names, currencies, timezones, and statuses. Use organization IDs from the List Organizations tool.

### List Ad Squads

List all ad squads (ad sets) under a Snapchat campaign. Returns ad squad IDs, names, statuses, budgets, bids, and targeting details.

### List Ads

List all ads under a Snapchat ad squad. Returns ad IDs, names, statuses, creative associations, and timestamps.

### List Audience Segments

List all custom audience segments under a Snapchat ad account. Returns segment IDs, names, source types, user counts, and statuses.

### List Campaigns

List all campaigns under a Snapchat ad account. Returns campaign IDs, names, statuses, objectives, budgets, and schedules.

### List Creatives

List all creatives under a Snapchat ad account. Returns creative IDs, names, types, headlines, and media associations.

### List Organizations

List all Snapchat organizations accessible to the authenticated user. Returns organization IDs, names, and statuses. Use this to discover available organizations before managing ad accounts or campaigns.

### Manage Ad Squad

Create or update a Snapchat ad squad (ad set) under a campaign. Ad squads define targeting, budget, bid, and schedule for a group of ads. To create, provide a **campaignId** and ad squad properties. To update, also provide an **adSquadId**.

### Manage Ad

Create or update a Snapchat ad within an ad squad. An ad links a creative to an ad squad for delivery. To create, provide **adSquadId** and properties. To update, also provide **adId**.

### Manage Audience Segment

Create or update a Snapchat custom audience segment. Segments can be customer lists (hashed emails, phones, mobile ad IDs), pixel-based audiences, or lookalike audiences. To create, provide **adAccountId** and segment properties. To update, also provide **segmentId**.

### Manage Campaign

Create or update a Snapchat advertising campaign. To create a new campaign, provide an **adAccountId** and campaign properties. To update, also provide a **campaignId**. Supports setting name, status, objective, budget, and schedule.

### Manage Creative

Create or update a Snapchat ad creative. Creatives define the visual content and call-to-action for ads. Supports Snap Ads, Story Ads, Collection Ads, and more. To create, provide **adAccountId** and creative properties. To update, also provide **creativeId**.

### Manage Pixel

List, retrieve, or update Snap Pixels for a Snapchat ad account. Snap Pixels are created in Ads Manager; the Marketing API supports reading and updating existing pixels.

### Send Conversion Event

Send web, app, or offline conversion events to Snapchat via the Conversions API (CAPI). Supports standard event types like purchases, add-to-cart, page views, sign-ups, and custom events. Events are used for ad attribution and optimization.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
