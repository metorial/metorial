# <img src="https://provider-logos.metorial-cdn.com/meta.jpg" height="20"> Messenger

Send and receive messages between Facebook Pages and users through Messenger. List conversations and read recent messages. Create rich message templates including carousels, buttons, receipts, and media. Upload reusable media attachments for later sends. Manage Messenger profile settings such as greeting text, persistent menus, get started buttons, account linking, and ice breakers. Retrieve user profile information. Display typing indicators, read receipts, and reactions. Handle and inspect conversation handover between bots and live agents. Supports the 24-hour standard messaging window and the human agent tag for later replies.

## Tools

### Get Connected Page

Get the Facebook Page this connection sends as: its Page ID, name, link, and picture. Without `pages_read_engagement` only the Page ID is returned.

### Get User Profile

Retrieve profile information for a Messenger user who has interacted with your Page. Returns the name and profile picture by default; locale, timezone, and gender can be requested when the Page has the matching permissions.

### List Conversations

List the Page's Messenger conversations with each participant's Page-scoped ID (PSID), optionally only the conversation with one person. Needs `pages_messaging`, `pages_manage_metadata`, and `pages_read_engagement`.

### List Conversation Messages

List messages in a conversation, newest first, with sender, recipients, text, reply target, and attachment details. Messenger only returns details for the 20 most recent messages.

### Manage Thread Handover

Control and inspect which app owns a conversation (Conversation Routing). **Pass**, **take**, **request**, **release**, or **extend** thread control, get the current thread owner and its expiration, or list secondary receiver apps.

### Manage Messenger Profile

Configure the Messenger experience for your Page. Set or update the **Get Started** button, **account linking URL**, **greeting text**, **persistent menu** (postback and web URL items), **ice breakers**, and **whitelisted domains**. Provide only the fields you want to update — unspecified fields remain unchanged. Use the **delete** action to remove specific profile settings.

### Send Message

Send a text message or media attachment to a Messenger user. Supports plain text with optional quick reply buttons, media attachments (images, videos, audio, files) via URL or reusable attachment ID, multiple images, and replies to an earlier message. Outside the standard messaging window only the `HUMAN_AGENT` tag is accepted; Meta retired `CONFIRMED_EVENT_UPDATE`, `POST_PURCHASE_UPDATE`, and `ACCOUNT_UPDATE` on April 27, 2026.

### Upload Attachment

Upload an image, video, audio file, or file URL to Messenger and receive a reusable attachment ID for later Send API calls. Attachment IDs expire after 90 days.

### Send Template

Send a structured message template to a Messenger user. Supports **Generic** (carousel), **Button**, **Media**, and **Receipt** templates. Choose the appropriate templateType and provide the corresponding fields.

### Send Sender Action

Display a typing indicator, mark a conversation as read, or react to a message. Use **typing_on** / **typing_off** for the typing bubble, **mark_seen** for a read receipt, and **react** / **unreact** to add, change, or remove the Page's emoji reaction on a message.

## Chat Adapter

This integration also exposes a normalized chat interface that acts as the connected Facebook Page. Both the Facebook OAuth and Page Access Token connections can use it.

- **Workspace:** the connected Facebook Page (its Page id and name).
- **Permissions:** sending and receiving need only `pages_messaging`, which is all a token from **Messenger API Settings > Generate access tokens** carries. With `pages_read_engagement` the Page name and picture are included; without it the Page appears by its id.
- **Channels:** each person's conversation with the Page is a direct-message channel whose id is the person's Page-scoped id (PSID).
- **Messages:** text is sent as plain text. Markdown is flattened (links keep their URL), and tables, charts, and fields use a plain-text layout. Inline images and card images are rejected instead of dropped. Replies quote a specific message.
- **Files:** each file is delivered as its own Messenger message (up to 25 MB), which is returned together with the attachment. Downloads resolve a fresh Meta CDN link from the message when possible.

| Capability | Support |
| --- | --- |
| Send message (text, reply to a message) | Native |
| Edit / delete message | Not available: the Messenger Platform has no API to edit or delete Page messages |
| Add / remove reaction | Native (`react` / `unreact` sender actions; the Page has one reaction per message, so removing clears it) |
| Mark read | Native (`mark_seen` marks the whole conversation seen) |
| Typing indicator | Native (`typing_on`, no thread needed) |
| Get channel | Documented fallback: derived from the PSID, enriched with the person's profile when allowed |
| List channels / members, message history, search | Not available in the basic set |
| Workspace list / get, authenticated user | Native (the Page) |
| Get user | Native (User Profile API; falls back to the PSID when profile access is not granted) |
| Upload file | Native, one message per file |
| Download file | Native (Meta CDN URL) |
| Setup instructions | Available without a connection |
| Ephemeral messages, threads, mentions, slash commands | Not available on Messenger |

### Events

Events arrive through a Messenger webhook configured in the Meta App Dashboard (`page` object). The webhook setup asks for the app's **App Secret** and a **Verify Token** you choose; finish it before saving the Callback URL in Meta, because Meta verifies the URL immediately. Subscribe the app and each connected Page to `messages`, `message_reactions`, and `message_edits`.

| Event | Source | Event id |
| --- | --- | --- |
| Message received (text, attachments, shared links, reply target) | `messages` | `message:<mid>` |
| Message updated | `message_edits` | `message_edit:<mid>:<num_edit>` |
| Reaction added / removed | `message_reactions` (`react` / `unreact`) | `reaction:<mid>:<psid>:<action>:<emoji>:<timestamp>` |

Every request is checked against the `X-Hub-Signature-256` signature computed with the App Secret over the raw body. Events are routed to the connection whose Page id matches the delivery's `entry[].id`. Message echoes (messages the Page itself sent, including messages sent through this integration), deliveries, reads, and postbacks are acknowledged without producing events, so the app never reacts to its own messages. See Meta's [webhook events reference](https://developers.facebook.com/docs/messenger-platform/reference/webhook-events).

Standard messages can only be sent within 24 hours of the person's last message to the Page; later sends fail with a "direct messages not allowed" chat error explaining the window.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
