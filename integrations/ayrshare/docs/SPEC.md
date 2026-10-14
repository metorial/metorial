# Ayrshare Integration

Publish and schedule posts across Ayrshare's supported social networks, inspect publication status and analytics, manage comments and direct messages, read reviews, and manage user profiles and RSS subscriptions.

## Authentication

The API key from the Primary Profile is sent as `Authorization: Bearer <API_KEY>`. An optional Profile Key in configuration targets a specific user profile with the `Profile-Key` header. Profile management tools operate with the Primary Profile API key.

X operations require the optional `twitterApiKey` and `twitterApiSecret` connection fields together. They are the X Developer App OAuth 1.0a consumer credentials and are sent as `X-Twitter-OAuth1-Api-Key` and `X-Twitter-OAuth1-Api-Secret`. Ayrshare API-key authentication does not use OAuth refresh tokens.

## Tools

| Workflow | Tool keys |
| --- | --- |
| Publishing | `create_post`, `delete_post`, `update_post`, `validate_post`, `retry_post` |
| History | `get_post_history`, `get_post_history_by_id` |
| Analytics | `get_post_analytics`, `get_social_analytics` |
| Comments | `get_comments`, `post_comment`, `delete_comment` |
| Direct messages | `send_message`, `get_messages` |
| Media and hashtags | `upload_media`, `generate_hashtags` |
| Profiles and identity | `create_profile`, `get_profiles`, `delete_profile`, `get_current_user` |
| Reviews | `get_reviews` |
| RSS feeds | `add_feed`, `get_feeds`, `delete_feed` |

`create_post.platformOptions` remains keyed by the social network name. For example, `youtube` maps to Ayrshare's `youTubeOptions`, `facebook` to `faceBookOptions`, and `snapchat` to `snapChatOptions`. `idempotencyKey` can detect duplicate submissions per profile. With a Profile Key, post results may be nested under `posts`; the tool exposes the first post's existing fields and the full `posts` list.

`update_post.scheduledPause` pauses or resumes a scheduled post. Resuming when the scheduled time has passed can publish immediately. `notes` sets reference notes. A request must contain at least one update field.

`retry_post` queues one retry for a failed post. Verify that the original error supports retrying and that the social network did not already publish the post. Check `get_post_history_by_id` for the final result.

`get_messages` returns one page. Pass `nextCursor` as the next request's `next`, keeping the same platform, profile, and filters. Continue while `hasMore` is true, including after an empty filtered page. On X, supplying `limit` on the initial request selects the live timeline and disables the stored-history filters. Conversation details are exposed both as `conversations` and by ID in the existing `conversationDetails` field.

## Provider limits

Published Instagram and TikTok posts cannot be deleted through Ayrshare. Facebook image stories must be deleted manually. Messaging must be activated for the account and user profile; Facebook and Instagram conversations must be initiated by the correspondent. Profile management requires an eligible Business plan. RSS auto-posting to X ended on March 31, 2026; other platforms remain supported. Media uploads accept the existing Base64 Data URI input, are limited to 30 MB, and are retained for 90 days. Successful pre-publication validation does not guarantee social networks will accept a post.
