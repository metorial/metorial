# Superhuman Gmail API specification

## Supported surface

The package uses Google Gmail v1 at `https://gmail.googleapis.com/gmail/v1`, independently of Superhuman Mail's native OAuth/Dynamic Client Registration MCP endpoint. No private Superhuman REST endpoints are assumed. Native reminders, tracking, calendars and Superhuman drafts are outside this Gmail-backed surface. See [Superhuman's native service documentation](https://help.superhuman.com/hc/en-us/articles/46005696690317-Superhuman-Mail-MCP-Server), including its Gmail/native draft separation.

## API mapping

| Tool | Official Gmail methods |
| --- | --- |
| Profile | [`users.getProfile`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile) |
| Search | [`users.threads.list`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/list), repeated `labelIds`, `q`, `maxResults` 1–500, `pageToken`, `includeSpamTrash` |
| Context | [`users.threads.get`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/get), full/metadata/minimal |
| Triage | [`users.threads.modify`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/modify), trash/untrash, delete |
| Drafts | [`users.drafts`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts): list/get/create/PUT update/send/delete |
| Reply | [`users.messages.send`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send) |
| Download | [`users.messages.get`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get) for ownership and MIME metadata, then [`users.messages.attachments.get`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get) when bytes are not embedded in the part |

Gmail returns base64url message/file data in JSON. Downloads decode those bytes before presenting the file. Full context decodes UTF-8 or a declared supported text character set; minimal context does not synthesize headers or reply hints. Listed conversation stubs and send responses may omit metadata; unavailable fields remain absent rather than receiving fabricated values. `resultSizeEstimate` is an estimate, and `returnedCount` is the current page length.

## Reply and draft semantics

[Thread membership](https://developers.google.com/workspace/gmail/api/guides/threads) needs `threadId`, RFC Message-ID reply headers and a matching subject. Parent selection excludes unsent drafts, and explicit parent IDs must belong to the conversation. If the latest message was sent by this mailbox, recipient defaults use its To header. Individual reply-header overrides are respected independently. All caller-controlled MIME headers reject control characters before provider requests.

Gmail [draft updates replace content](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/update). A header-only update retains the original body bytes and omitted headers, including Bcc. An explicit body update preserves omitted recipients, reply headers, filenames, file bytes and inline content IDs. Complex non-text MIME parts that cannot be retained safely are rejected before writing. Update readback detects intervening message-ID changes when retrieving raw content, but Gmail offers no conditional update guarantee for the final write.

## Authentication and failures

Authorization uses `https://accounts.google.com/o/oauth2/v2/auth`; code exchange and refresh use `https://oauth2.googleapis.com/token`. State is checked, offline refresh is supported, the actual expiry is normalized, and an omitted replacement refresh token preserves the previous token. Connection identity comes from Gmail's `me/profile`, avoiding unused userinfo permissions.

Separate [scope tiers](https://developers.google.com/workspace/gmail/api/auth/scopes) request modify, read-only or full Gmail access. Permanent delete requires full access. Read-only connections can list/get drafts; write operations reject known insufficient stored grants or receive Gmail's permission failure for older connections without stored grant metadata.

Requests encode identifiers, reject redirects, have a 30-second timeout, and do not automatically retry sends or writes. Errors retain useful HTTP status and remediation while omitting tokens, recipients, query contents, message data and raw transport parents. No history-polling or webhook triggers are registered.
