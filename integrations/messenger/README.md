# <img src="https://provider-logos.metorial-cdn.com/meta.jpg" height="20"> Messenger

Send and receive messages between Facebook Pages and users through Messenger. Create rich message templates including carousels, buttons, receipts, and media. Upload reusable media attachments for later sends. Manage Messenger profile settings such as greeting text, persistent menus, get started buttons, account linking, and ice breakers. Retrieve user profile information. Display typing indicators and read receipts. Handle and inspect conversation handover between bots and live agents. Supports a 24-hour messaging window with message tags for follow-up communications.

## Tools

### Get User Profile

Retrieve profile information for a Messenger user who has interacted with your Page. Returns available fields such as name, profile picture, locale, timezone, and gender.

### Manage Thread Handover

Control and inspect conversation thread ownership between apps using the Handover Protocol. **Pass** thread control to another app, **take** thread control back, **request** thread control from the current owner, get the current thread owner, or list secondary receiver apps.

### Manage Messenger Profile

Configure the Messenger experience for your Page. Set or update the **Get Started** button, **account linking URL**, **greeting text**, **persistent menu**, **ice breakers**, and **whitelisted domains**. Provide only the fields you want to update — unspecified fields remain unchanged. Use the **delete** action to remove specific profile settings.

### Send Message

Send a text message or media attachment to a Messenger user. Supports plain text with optional quick reply buttons, and media attachments (images, videos, audio, files) via URL. Use **messagingType** and **tag** to send messages outside the 24-hour messaging window.

### Upload Attachment

Upload an image, video, audio file, or file URL to Messenger and receive a reusable attachment ID for later Send API calls.

### Send Template

Send a structured message template to a Messenger user. Supports **Generic** (carousel), **Button**, **Media**, and **Receipt** templates. Choose the appropriate templateType and provide the corresponding fields.

### Send Sender Action

Display a typing indicator or mark a message as read in a Messenger conversation. Use **typing_on** to show a typing bubble, **typing_off** to hide it, and **mark_seen** to show a read receipt.

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
