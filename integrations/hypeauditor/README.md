# Hypeauditor

Search and discover influencers across Instagram, YouTube, TikTok, Twitter/X, Twitch, and Snapchat. Retrieve analytics reports, recent media, metrics history, brand mentions, and connected accounts. Look up discovery category IDs and retrieve posts identified by content keyword searches. Export reports as downloadable PDFs, organize reports in existing lists, analyze Instagram competitors, retrieve My Network creator profiles, and audit unlocked report activity.

Authenticate with your HypeAuditor Client ID and API token. The report API defaults to version 2; version 1 is deprecated. API access, supported platforms, and credit consumption depend on your subscription. Report and PDF generation can be asynchronous; use the returned retry delay before requesting them again.

For TikTok media, use the channel ID from an influencer report. My Network supports numeric cursors and opaque string cursors through `cursorToken` / `nextCursorToken`. PDF exports retain the provider download URL, whose documented lifetime is 28 days, and also provide the existing PDF file for download.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
