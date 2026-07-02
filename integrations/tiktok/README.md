# <img src="https://provider-logos.metorial-cdn.com/tiktok.svg" height="20"> Tiktok

Interact with TikTok's consumer and business API ecosystems. Authenticate users via TikTok Login Kit, retrieve user profile information (display name, avatar, bio, follower counts), and query video metadata (views, likes, comments, shares). Post videos and photos to TikTok, manage content publishing workflows, and embed TikTok videos on websites. Create and manage advertising campaigns, ad groups, and ads through TikTok Ads Manager. Build and manage audiences for ad targeting, run ad performance reports, and manage creative assets and product catalogs. Access the Creator Marketplace API for influencer marketing and boosted content. Query public video and comment data for research purposes using filters like hashtag, keyword, region, and date range. Track conversions via the Events API by sharing marketing data from servers, websites, or CRMs. Receive webhook notifications for video publish events, authorization changes, lead generation, ad review status, and creator marketplace order updates. Manage business messaging for real-time user engagement and transfer user data via the Data Portability API.

## Tools

### Create Ad Group

Create a new ad group within a TikTok Ads campaign. Configure targeting (location, age, gender), budget, schedule, bidding strategy, and optimization goal.

### Get Ad Groups

Retrieve TikTok Ads ad groups for an advertiser. Filter by campaign IDs or specific ad group IDs. Returns ad group details including targeting, budget, schedule, and optimization settings.

### Get Ad Report

Pull advertising performance reports from TikTok Ads Manager. Configure dimensions (how to group data), metrics (what data to retrieve), data level, and date range. Supports filtering by campaign, ad group, or ad. Common **dimensions**: \

### Get Ads

Retrieve TikTok ads for an advertiser. Filter by campaign IDs, ad group IDs, or specific ad IDs. Returns ad details including name, status, and timestamps.

### Get Campaigns

Retrieve TikTok Ads campaigns for an advertiser. Optionally filter by specific campaign IDs. Returns campaign details including name, objective, budget, status, and timestamps.

### Get Creator Info

Retrieve the authenticated creator's posting capabilities and constraints. Returns available privacy level options, interaction settings (comments, duet, stitch), and maximum video duration. **Must be called before posting content** to determine valid settings.

### Get Publish Status

Check the status of a previously initiated content post on TikTok. Returns the current publishing stage, any failure reasons, and the public post ID once moderation is complete.

### Get User Profile

Retrieve the authenticated TikTok user's profile information including display name, avatar, bio, verification status, follower/following counts, and video count. The level of detail depends on the granted OAuth scopes.

### List Advertisers

List TikTok Ads advertiser accounts that have granted the connected TikTok Business app permission. Use this to discover advertiser IDs before calling campaign, ad group, ad, and reporting tools.

### List Videos

Retrieve a paginated list of the authenticated user's public TikTok videos, sorted by creation time (newest first). Returns video metadata including engagement metrics, embed links, and cover images. Use cursor-based pagination to retrieve additional pages.

### Manage Campaign

Create, update, or change the status of TikTok Ads campaigns. Supports creating a new campaign with objective type and budget settings, updating an existing campaign's name or budget, and enabling/disabling campaigns. Use the **action** field to specify the operation: - **create**: Create a new campaign - **update**: Update campaign name, budget, or budget mode - **updateStatus**: Enable, disable, or delete campaigns

### Post Photo

Initialize a photo post to the authenticated user's TikTok profile by providing publicly accessible image URLs. Returns a publish ID to track the post status.

### Post Video

Initialize a video post to the authenticated user's TikTok profile. Supports posting from a public URL or initializing a file upload. Returns a publish ID to track the post status and, for file uploads, an upload URL.

### Query Videos

Look up specific TikTok videos by their IDs. Returns video metadata including cover image, engagement metrics, embed links, and dimensions. Useful for refreshing expired cover image URLs or fetching details for known videos.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
