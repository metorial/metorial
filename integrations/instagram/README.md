# <img src="https://provider-logos.metorial-cdn.com/instagram.svg" height="20"> Instagram

Publish photos, videos, Reels, Stories, and carousels to Instagram. Retrieve and manage media with metadata such as captions, timestamps, and permalinks. Moderate comments by creating, replying, deleting, hiding, or disabling them. Access account and media-level insights including reach, views, saves, likes, comments, shares, and audience demographics. Search public posts by hashtag. Discover and retrieve mentions of your brand and other business/creator account profiles. Send and receive direct messages including text, media, and story replies within the 24-hour messaging window. Receive real-time webhook notifications for new comments, mentions, story insights, and incoming messages.

## Tools

### Get Insights

Retrieve analytics and performance insights for an Instagram account or specific media post. Account-level insights include reach, profile views, and audience metrics. Media-level insights include reach, views, saves, likes, comments, and shares.

### Get Media

Retrieve Instagram media. Fetch a single post by media ID for full details including carousel children, or list recent media from an account with pagination support.

### Get Publishing Limit

Retrieve the authenticated Instagram professional account's current API content publishing quota usage for the rolling publishing window.

### Get Mentions

Retrieve posts where your Instagram account has been tagged or @mentioned. Returns media where you were tagged in photos, as well as active stories.

### Get Profile

Retrieve an Instagram Business or Creator account's profile information including username, biography, follower/following counts, and media count. Can fetch your own profile or discover another business/creator account by username.

### Get Stories

Retrieve currently active (non-expired) stories from an Instagram account. Stories are only available for 24 hours after publishing.

### Manage Comments

Create, retrieve, reply to, delete, or hide/unhide comments on Instagram media. Also supports listing replies and enabling or disabling comments on a specific post.

### Publish Media

Publish media to Instagram. Supports single image posts, Reels (video), Stories, and carousel albums. Publishing follows a two-step process internally: creating a media container and then publishing it. For carousels, provide multiple image/video URLs and they will be combined automatically.

### Search Hashtags

Search for recent or top public posts tagged with a specific hashtag. This is the only way to search public content on Instagram via the API. Returns posts with their captions, media URLs, and engagement metrics.

### Send Message

Send a direct message to an Instagram user, or send a private reply to a comment. Supports text messages, image attachments, and media-share attachments. Also supports fetching recent conversations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
