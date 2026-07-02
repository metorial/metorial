# <img src="https://provider-logos.metorial-cdn.com/sprout-social.png" height="20"> Sprout Social

Manage social media presence across X, Facebook, Instagram, LinkedIn, YouTube, TikTok, Pinterest, Threads, and Bluesky. Retrieve profile analytics including impressions, follower counts, engagement, and video views. Access post-level performance metrics such as reactions, comments, and shares. Retrieve messages (posts, comments, DMs, mentions, reviews) received or published by owned profiles. Create draft publishing posts with scheduled delivery times, media attachments, and tags targeting multiple profiles and networks. Upload media files for use in posts. Query social listening topics for earned media data including sentiment, engagement, and volume metrics. Manage customer care cases filtered by status, priority, type, queue, and assigned user. Retrieve account metadata including connected profiles, groups, tags, users, teams, and listening topics.

## Tools

### Create Draft Post

Create a draft publishing post in Sprout Social intended for future publication to social networks. Posts are created on the Sprout Publishing Calendar and can target multiple profiles and scheduled times. Sprout will fan out one calendar entry per profile/time combination.

### Get Cases

Retrieve customer care cases from Sprout Social. Cases represent customer inquiries, issues, or engagements that may require action by a social care agent. Filter by creation time, status, priority, type, queue, assigned user, and tags.

### Get Listening Messages

Retrieve earned media messages from a Sprout Social Listening Topic. Returns individual messages with their content, author, and metrics. Messages can be filtered by time range, network, sentiment, language, location, and more.

### Get Listening Metrics

Retrieve aggregated metrics for a Sprout Social Listening Topic. Returns metrics such as total engagement, likes, replies, shares, impressions, volume, sentiment counts, and author counts. Results can be broken down by time period, sentiment, network, media type, and location.

### Get Messages

Retrieve messages published by or received by owned profiles in Sprout Social. Includes posts, comments, direct messages, mentions, reviews, and replies across all connected social networks. Messages include Sprout actions taken (reply, tag, complete, like) and associated case IDs.

### Get Metadata

Retrieve account metadata from Sprout Social including connected social profiles, groups, tags (labels and campaigns), users, teams, listening topics, and case queues. This data is essential for obtaining IDs needed by other operations (e.g., **customer_profile_id** values for analytics queries, **group_id** for messages, **topic_id** for listening).

### Get Post Analytics

Retrieve post-level analytics data from Sprout Social matching the Post Performance Report. Returns individual published posts with their content, metadata (tags, author, permalink), and lifetime performance metrics such as impressions, reactions, comments, shares, and video views.

### Get Profile Analytics

Retrieve owned profile analytics data from Sprout Social matching the Profile Performance reports. Returns daily aggregated metrics such as impressions, follower counts, engagement, and video views for profiles across X, Facebook, Threads, Instagram, LinkedIn, Pinterest, YouTube, and TikTok.

### Get Publishing Post

Retrieve a publishing post from Sprout Social by its ID. Returns the fanned-out representation of the post showing individual entries per profile/time combination, including delivery status and metadata.

### Upload Media

Upload a media file to Sprout Social from a publicly accessible URL for use with publishing posts. Returns a media ID that can be used when creating draft posts. Supports images (PNG, JPEG, GIF, WebP, HEIC, AVIF) and videos (MP4, MOV, AVI, MPEG, WebM).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
