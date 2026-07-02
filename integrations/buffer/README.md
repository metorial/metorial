# <img src="https://provider-logos.metorial-cdn.com/buffer.png" height="20"> Buffer

Schedule, publish, and manage social media posts across multiple networks (Twitter/X, Facebook, Instagram, LinkedIn, Pinterest). Create and edit updates with text, media, and link attachments. Manage posting queues by reordering, shuffling, or prioritizing updates. Retrieve pending and sent posts with engagement statistics (reach, clicks, retweets, favorites, mentions). Manage connected social media profiles and their posting schedules. Retrieve social media interactions such as mentions, retweets, likes, and comments on sent updates. Get link sharing statistics and service configuration details including character limits and supported features per network.

## Tools

### Create Update

Create a new social media update (post) and add it to the queue for one or more profiles. Supports scheduling, immediate sharing, media attachments, and queue positioning.

### Delete Update

Permanently delete an existing status update from the queue.

### Edit Update

Edit an existing pending update. Modify the text, scheduling, or media attachments of an update that has not yet been sent.

### Get Service Configuration

Retrieve Buffer's current service configuration. Returns supported social networks, character limits, schedule limits, supported interaction types, and analytics filters per network.

### Get Interactions

Retrieve social media interactions (mentions, retweets, likes, comments, etc.) for a sent update. Supported interaction types vary by social network.

### Get Link Shares

Get the number of times a URL has been shared using Buffer. Useful for gauging the popularity of a link across the Buffer network.

### Get Profiles

Retrieve connected social media profiles. Returns all profiles linked to the account, or a single profile by ID. Includes service type, username, avatar, and post counts.

### Get Updates

Retrieve updates (posts) for a social media profile. Supports fetching pending (queued) updates, sent updates, or a single update by ID. Sent updates include engagement statistics.

### Get User

Retrieve the authenticated Buffer user's account details including plan type, timezone, and profile information.

### Manage Queue

Manage the posting queue for a profile. Supports reordering updates, shuffling the queue randomly, or moving a specific update to the top.

### Manage Posting Schedule

View or update the posting schedule for a social media profile. The schedule defines which days and times Buffer will automatically publish queued updates.

### Share Update Now

Immediately share a pending update that is currently in the queue. The update is published right away and remaining queue times are recalculated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
