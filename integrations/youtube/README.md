# <img src="https://provider-logos.metorial-cdn.com/youtube.svg" height="20"> Youtube

Search and manage YouTube videos, channels, playlists, comments, captions, ratings, subscriptions, and related metadata through the YouTube Data API.

## Tools

### Delete Video

Permanently delete a YouTube video. This action cannot be undone. Requires ownership of the video.

### Get Channel

Retrieve detailed information about YouTube channels. Look up by channel ID, username, or get the authenticated user's own channel. Returns snippet, statistics, content details, and branding settings.

### Get Video Details

Retrieve detailed information about one or more YouTube videos by ID. Returns snippet (title, description, tags), statistics (views, likes, comments), content details (duration, definition), and status (privacy, license).

### List Activities

Retrieve activity feed for a YouTube channel or the authenticated user. Activities include uploads, likes, favorites, comments, subscriptions, and more. Results can be filtered by date range.

### List Captions

List all caption tracks for a YouTube video. Returns caption metadata including language, track kind, status, and whether it's auto-generated. Can also delete a caption track by ID.

### List Comments

List comment threads on a YouTube video or channel. Returns top-level comments with reply counts, or list replies to a specific comment. Supports filtering by search terms and moderation status.

### List YouTube Metadata

List YouTube Data API metadata used by other tools, including upload video categories, supported content regions, and supported interface languages.

### List Videos

List YouTube videos from supported charts or the authenticated user's liked/disliked videos. Use this to retrieve popular videos by region/category or videos the user has rated.

### List Playlists

List YouTube playlists by ID, channel, or for the authenticated user. Returns playlist metadata including title, description, privacy status, and item count.

### Manage Comments

Post, reply to, update, delete, or moderate comments on YouTube videos. Use "post" to create a new top-level comment, "reply" to respond to an existing comment, "update" to edit a comment, "delete" to remove one, or "moderate" to change moderation status.

### Manage Playlist Items

Add, reorder, or remove videos from a YouTube playlist. Use "add" to insert a video, "update" to change position, "remove" to delete an item, or "list" to view playlist contents.

### Manage Playlist

Create, update, or delete a YouTube playlist. When creating, provide a title and optional description, privacy, and tags. When updating, provide the playlist ID and fields to change. When deleting, provide only the playlist ID.

### Manage Subscriptions

List, create, or delete YouTube channel subscriptions. List subscriptions for the authenticated user or a specific channel. Subscribe to or unsubscribe from channels.

### Rate Video

Rate a YouTube video (like, dislike, or remove rating). Can also retrieve the authenticated user's current rating for one or more videos.

### Search YouTube

Search for videos, channels, and playlists on YouTube. Supports filtering by search terms, channel, type, date range, region, video duration, definition, and more. Returns paginated results with snippet information.

### Update Channel

Update branding settings for a YouTube channel. Can modify the channel description, keywords, unsubscribed trailer, and country. Requires channel ownership.

### Update Video

Update a YouTube video's metadata and/or status settings. Can update title, description, tags, category, privacy status, license, and other settings in a single call. Requires ownership of the video.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
