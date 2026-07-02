# <img src="https://provider-logos.metorial-cdn.com/twitch-logo.jpeg" height="20"> Twitch

Manage Twitch live-streaming channels, streams, and viewer engagement. Retrieve and update channel information (title, game, language). Monitor live streams with viewer counts and metadata. Manage subscriptions, followers, and chat (send messages, announcements, whispers, configure chat settings). Moderate channels by banning/unbanning users, managing timeouts, configuring AutoMod, and managing blocked terms. Create and manage clips and videos. Create and manage custom channel points rewards and track redemptions. Run polls and predictions with Channel Points wagering. Monitor Hype Trains, initiate raids, and manage broadcast schedules. Access analytics for extensions and games. Manage charity campaigns, ads, Drops entitlements, and extensions. Subscribe to real-time events via EventSub (webhooks or WebSocket) for stream status, chat messages, subscriptions, moderation actions, channel point redemptions, and more.

## Tools

### Get Channel Info

Retrieve channel details including stream title, game/category, language, tags, and content labels. Can look up multiple channels at once.

### Get Followers & Subscribers

Retrieve a channel's follower list, subscriber list, or check a specific user's follow/subscription status. Returns totals and individual user details with dates and subscription tiers.

### Get Streams

Retrieve information about active live streams. Filter by user, game, or language. Returns viewer count, game, title, and stream start time.

### Get User Info

Retrieve Twitch user profiles by user ID or login name. Returns display names, profile images, account type, creation date, and description. Can fetch the authenticated user's own profile or look up other users.

### Get Videos

Retrieve VODs, highlights, and past broadcasts from Twitch. Filter by user, game, or specific video IDs. Supports sorting and time period filtering.

### Manage Channel Points

Create, update, delete, and view custom Channel Points rewards. Also manage reward redemptions by fulfilling or canceling them.

### Manage Chat Settings

View and update chat settings for a channel. Configure emote-only mode, follower-only mode, slow mode, subscriber-only mode, and unique chat mode.

### Manage Clips

Create clips from live streams or retrieve existing clips. Create a clip of the current broadcast, or search clips by broadcaster, game, or clip ID.

### Manage Moderation

Perform moderation actions on a channel: ban/unban users, timeout users, delete messages, and manage Shield Mode. Combines all common moderation operations into a single tool.

### Manage Polls

Create, end, or view polls on a channel. Create polls with custom choices and optional Channel Points voting. End polls early to show final results or archive them.

### Manage Predictions

Create, resolve, lock, cancel, or view Channel Points predictions. Viewers wager Channel Points on prediction outcomes.

### Manage Raids

Start or cancel a raid to another channel. Raids redirect your viewers to another streamer's channel.

### Manage Roles

View, add, or remove moderator and VIP roles on a channel. List current moderators/VIPs, grant mod/VIP status to users, or revoke it.

### Search

Search for channels or game/category on Twitch. Find channels by name or keyword, optionally filtering to live channels only. Search for games/categories to get their IDs for use in other tools.

### Send Chat Message

Send a chat message to a Twitch channel. Supports regular messages, replies to existing messages, and chat announcements with optional color styling.

### Send Shoutout

Send a shoutout to another broadcaster. Shoutouts promote another channel by displaying it in chat and the viewer's activity feed.

### Start Commercial

Start a commercial (ad break) on a channel. The broadcaster must be live and an affiliate or partner.

### Update Channel

Update a channel's broadcast configuration. Modify the stream title, game/category, language, tags, stream delay, and content classification labels.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
