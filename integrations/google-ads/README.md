# <img src="https://provider-logos.metorial-cdn.com/googleads.png" height="20"> Google Ads

Create, manage, and optimize advertising campaigns across Google Search, Display Network, YouTube, and Shopping. Configure ad groups, keywords, bidding strategies, audience targeting, and geographic targeting. Track and import conversions including offline and enhanced conversions. Generate reporting and analytics using Google Ads Query Language (GAQL). Plan keywords with historical metrics and forecasts. Manage account hierarchies and multi-account operations. Receive lead form webhook data from campaigns.

## Tools

### Generate Keyword Ideas

Generates keyword suggestions based on seed keywords, a URL, or both. Returns keyword ideas with historical metrics including average monthly searches, competition level, and suggested bid ranges. Similar to the Keyword Planner tool in the Google Ads UI. Useful for keyword research, discovering new targeting opportunities, and estimating traffic potential.

### List Accounts

Lists all Google Ads customer accounts accessible to the authenticated user. Returns account IDs, names, currency, timezone, and status for each account. Useful for discovering which accounts can be managed and obtaining customer IDs needed for other operations.

### Manage Ad Groups

Create, update, or remove ad groups within a Google Ads campaign. Ad groups organize ads and keywords within a campaign. Supports setting the ad group name, status, type, CPC bid, and targeting URL.

### Manage Ads

Create, update, or remove ads within an ad group. Supports responsive search ads, expanded text ads, responsive display ads, and other ad formats. For responsive search ads, provide headlines and descriptions. Google will automatically test combinations. Pin headlines/descriptions to specific positions if needed.

### Manage Audience Lists

Create, update, or remove user lists (audience segments) for targeting. Supports CRM-based customer lists, rule-based lists, and remarketing lists. User lists can be applied to campaigns or ad groups for audience targeting, bid adjustments, or exclusions.

### Manage Bidding Strategies

Create, update, or remove portfolio bidding strategies that can be shared across multiple campaigns. Portfolio strategies centralize bid management and enable cross-campaign optimization. For campaign-level bidding, use the Manage Campaigns tool instead. This tool is specifically for shared/portfolio bidding strategies.

### Manage Campaigns

Create, update, or remove Google Ads campaigns. Supports setting campaign name, status, type, budget, start/end dates, bidding strategy, and network settings. When creating a campaign, a campaign budget is automatically created if \

### Manage Conversion Actions

Create, update, or remove conversion actions for tracking valuable customer actions. Conversion actions track events like purchases, sign-ups, phone calls, or app installs. Supports configuring conversion counting, attribution models, value settings, and conversion windows.

### Manage Keywords

Add, update, or remove keywords in an ad group. Also supports managing negative keywords at both the ad group and campaign levels. Keywords determine when ads are shown based on user search queries. Each keyword has a match type controlling how broadly it matches search terms.

### Run GAQL Query

Executes a Google Ads Query Language (GAQL) query to retrieve reporting data, resource details, or metrics from a Google Ads account. Supports querying any resource type including campaigns, ad groups, ads, keywords, conversions, and more. Use this tool to build custom reports, fetch performance metrics, or look up specific resources. The query follows the GAQL syntax: \

### Upload Offline Conversions

Upload offline click conversions to Google Ads. Imports real-world transaction data like in-store purchases, qualified phone leads, or CRM events to measure full-funnel conversion impact. Each conversion requires a Google Click ID (gclid) to link the offline event back to the original ad click.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
