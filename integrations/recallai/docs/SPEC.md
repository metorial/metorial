# Recall.ai Integration Specification

## Authentication

Use a Recall.ai API key with its workspace region: `us-east-1`, `us-west-2`, `eu-central-1`, or `ap-northeast-1`. Requests send `Authorization: Token <API_KEY>`. Keys do not expire; rotate them in the provider dashboard. The key is workspace-scoped. There is no suitable public current-user endpoint in the documented API.

## Available workflows

- Create, list, read, update, and delete scheduled bots. Read status from the latest status-change entry. Bots scheduled through Calendar V2 must be updated through calendar-event scheduling.
- Configure transcription, recording start behavior, mixed MP4/MP3 capture, real-time endpoints, and automatic leaving. Enabled mixed media uses an object; disabled media uses `null`. The old `host_join` recording value is retained in the input schema but rejected with a supported-value explanation.
- Read connected calendars and events through `/api/v2`. Event listing requires a calendar ID discovered with `list_calendars`. Schedule a bot with a deduplication key; the default scopes deduplication to one event. Read the event back or cancel its bot association.
- List and read recordings through `/api/v1/recording/`. Current bot responses expose recording IDs and available media. Read participants and their events from completed participant data, and meeting metadata from the recording's media shortcuts.
- Retrieve completed transcripts with speaker names and word timing. Current workspaces use the transcript's downloadable JSON; older bot responses retain their transcript endpoint. Segment indexes supply entry identifiers when current transcript JSON lacks its own entry IDs.
- Download mixed MP4 video, mixed audio, or transcript JSON. Temporary download URLs renew by reading the recording again. Recording retention and download URL expiration are independent.
- Send chat messages in an active meeting, with recipient and pin settings when supported. Google Meet allows 500 characters per message; other supported platforms allow up to 4096. Start or stop streaming an operator-controlled webpage through a bot's camera or screenshare. Audio output accepts MP3 data and requires the bot's automatic audio output to be enabled. Configure `automaticAudioOutput.inCallRecording.data` with `kind: "mp3"` and `b64Data` in `create_bot` or `update_bot` before dispatch; use a short silent MP3 when only on-demand playback is wanted. Read this configuration with `get_bot`.

All existing tool keys remain available. The optional `totalCount` output is a provider-wide total only when supplied; `returnedCount` reports the current page size. Bot creation timestamps are optional when the provider omits them. Older page-size and ordering input hints remain accepted, but current API pagination controls those settings.

## Limits

Schedule production bots at least ten minutes in advance. Only bots not yet dispatched can be changed or deleted. Calendar connections require the calendar owner's OAuth setup outside these tools. Recording or live-meeting operations can incur provider usage charges. Desktop/mobile capture SDK setup, signed-in bot account administration, and webhook registration are outside this tool surface.

## Official references

- [Authentication](https://docs.recall.ai/reference/authentication)
- [Bot creation](https://docs.recall.ai/reference/bot_create)
- [Bot updates](https://docs.recall.ai/reference/bot_partial_update)
- [Calendar V2 guide](https://docs.recall.ai/docs/calendar-v2-integration-guide)
- [Event scheduling](https://docs.recall.ai/reference/calendar_events_bot_create)
- [Recordings and media](https://docs.recall.ai/docs/recordings-and-media)
- [Download data schemas](https://docs.recall.ai/docs/download-schemas)
- [Temporary video URLs](https://docs.recall.ai/docs/video-playback)
- [Audio configuration and output](https://docs.recall.ai/docs/output-audio-in-meetings)
- [Chat platform limits](https://docs.recall.ai/docs/sending-chat-messages)
