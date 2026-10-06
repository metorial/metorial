# Twitch API coverage

The fixed API origins are api.twitch.tv/helix and id.twitch.tv/oauth2. Both historical authentication keys, oauth and access_token, remain. OAuth uses authorization code and refresh grants with form bodies. Consent requests only scopes used by the exposed tools. Read scopes on older tokens remain valid where Twitch accepts them. App-token delegated grants are checked by Twitch, not inferred from a user identity or the validation scope list.

| Tools | Native API |
| --- | --- |
| get_user_info, get_channel_info, update_channel | users, channels |
| get_streams, search, get_videos | streams, search/channels or categories, videos |
| send_chat_message, manage_chat_settings | chat/messages or announcements, chat/settings |
| manage_moderation | moderation/bans, moderation/chat, moderation/shield_mode |
| get_followers_subscribers | channels/followers, subscriptions |
| manage_clips, download_clip | clips, clips/downloads |
| manage_polls, manage_predictions | polls, predictions |
| manage_channel_points | channel_points/custom_rewards and redemptions |
| manage_raids, manage_roles | raids, moderation/moderators, channels/vips |
| start_commercial, send_shoutout | channels/commercial, chat/shoutouts |

All 18 historical tool keys and field shapes are preserved. Unsupported combinations and invalid native ranges fail locally instead of discarding fields. IDs stay strings, amounts/counts must be safely representable, and native status/receipt validation precedes success. Post-acceptance receipt refusal is uncertain and requires reconciliation; it does not undo an upstream effect. Channel game can be cleared with '0' or an empty string; zero reward limits disable their flags without submitting a zero enabled limit. Prediction windows are 30–1800 seconds and redemption pages hold at most 50 entries.

The active private suite is live-unverified. Controlled effect scenarios need explicit isolated-account and retained-effect acknowledgments before dispatch. Only a positively owned disabled custom reward has automatic deletion; other irreversible/history effects require manual reconciliation. Provider operations were not run during implementation.

Sources: [current Helix reference](https://dev.twitch.tv/docs/api/reference/), [scopes](https://dev.twitch.tv/docs/authentication/scopes/), [token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/), [OAuth grants](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/).
