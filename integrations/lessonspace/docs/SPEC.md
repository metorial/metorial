# Lessonspace integration

Create virtual classrooms, generate individual join links, inspect sessions and users, access recordings and transcripts, and delete recording data for retention workflows.

## Authentication and setup

Generate a hashed API key in Lessonspace Settings > Developer. Requests use `Authorization: Organisation <API key>` at `https://api.thelessonspace.com/v2/`. The key determines the organisation; no organisation ID is required. Existing connections that stored an organisation ID remain usable because current routes omit it and Lessonspace no longer uses IDs in legacy organisation routes.

The documented organisation-key API has no suitable current-account or current-user endpoint, so this integration does not invent an identity tool.

## Tools

| Tool | Outcome |
| --- | --- |
| `launch_space` | Create or reuse a classroom and generate an individual join URL, with recording, transcription, feature, theme, access-window, and user settings. |
| `list_sessions` | Browse session history or active sessions with search, time, duration, space, user, and tag filters. |
| `get_session` | Retrieve session identity, timing, participants, guest IDs, summary, and recording state. |
| `update_session` | Update the required session name and optionally its recording access policy. Reads the session first to retain its identity because the update response contains only updated fields. |
| `get_recording` | Return an interactive viewing URL and whether playback is ready. |
| `get_transcript` | Provide the complete session transcript as a downloadable JSON file and retain provider download metadata. |
| `list_spaces` | Browse classrooms by search, session, paired tag key/value, and date filters. |
| `list_users` | Browse organisation users by role, space, session, or search; exposes user IDs and available email or username fields. |
| `remove_user` | Remove a user from the organisation. |
| `delete_session_recordings` | Permanently delete audio/video, recorded events, and transcripts for one session. |
| `delete_space_recordings` | Permanently delete audio/video, recorded events, and transcripts for all sessions in a classroom. |

All list tools return a total count and `hasMore`. Increase `page` to continue through results. Session UUIDs come from `list_sessions`; space UUIDs come from `list_spaces`. These differ from the arbitrary `spaceId` supplied to `launch_space`.

## Recording and transcript behavior

Interactive recording URLs last approximately three hours. A preparing recording returns `ready: false`; content recording disabled for the session produces an explanatory error. Session `playbackUrl` fields are authenticated API endpoints, so call `get_recording` to obtain a viewing link.

Transcription must have been enabled and completed for an eligible session. Lessonspace's guide requires audio/video recording and describes eligibility as more than five minutes with more than one user. The API returns a signed download URL for the complete JSON transcript, valid for twelve hours. Downloads are renewed shortly before expiry. Legacy `get_transcript` search and page inputs remain accepted, but the current API does not apply filtering or pagination to the transcript file.

Recording deletion cannot be undone. Basic session metadata remains, and the classroom stays usable. Both deletion tools send the target UUID in the URL and body, as required by the provider. Recordings in customer-owned buckets remain protected unless `forceDeleteCustomBuckets` is explicitly true. Provider errors, including partial-deletion failures, are surfaced rather than reported as successful deletion.

## Join link settings

Join links expire seven days after creation by default. `notBefore` and `notAfter` restrict an individual link, with a maximum validity window of seven days. They do not globally restrict a classroom or automatically end the session. `user.singleUse` limits redemption to one user; `user.ghost` enables an invisible spectator. Custom signed link parameters are readable by link holders and must not include secrets. `roomSettings` exposes the provider-confirmed settings after launch.

This package registers no triggers.

## Official references

- [API reference](https://www.thelessonspace.com/docs/api)
- [Session recordings](https://www.thelessonspace.com/docs/guide/recordings)
- [Session transcriptions](https://www.thelessonspace.com/docs/guide/transcriptions)
- [Link expiry and validity](https://www.thelessonspace.com/docs/guide/02a.link-expiry)
- [Restricting access](https://www.thelessonspace.com/docs/guide/restricting-access)
- [API keys and recent API changes](https://www.thelessonspace.com/docs/overview/whats-new)
