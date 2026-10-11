# <img src="https://provider-logos.metorial-cdn.com/whatsapp-logo.svg" height="20"> Whatsapp Business

Send and receive WhatsApp messages at scale, including text, images, audio, video, documents, locations, contacts, and interactive elements (buttons, lists). Manage and send pre-approved message templates for marketing, utility, and authentication purposes. Upload and download media files for use in messages. Retrieve and update WhatsApp Business profile information. Register and manage business phone numbers. Create interactive WhatsApp Flows for sign-ups, surveys, and lead capture. Monitor inbound messages, outbound message statuses, and account events via webhooks.

## Tools

### Send Message

Send a WhatsApp message to a recipient. Supports **text**, **image**, **video**, **audio**, **document**, **location**, **contacts**, **sticker**, and **reaction** messages. Set `replyToMessageId` to send the message as a contextual reply that quotes an earlier message. Free-form messages require an open 24-hour customer service window; outside it, use Send Template Message.

### Send Interactive Message

Send an interactive WhatsApp message with **reply buttons** (up to 3), a **list menu** (up to 10 rows across up to 10 sections), or a **call-to-action URL button**. Supports contextual replies. Requires an open customer service window.

### Send Template Message

Send a pre-approved WhatsApp message template to a recipient. Templates can be sent **outside the 24-hour messaging window** and are required for business-initiated conversations. Supports positional (`{{1}}`) and named (`{{first_name}}`, via `parameterName`) parameters, media and location headers, and URL, quick-reply, and copy-code buttons.

### List Templates

List message templates in your WhatsApp Business Account with their IDs, statuses, categories, languages, parameter formats, rejection reasons, quality scores, and components. Filter by name, status, category, or language, and page with `nextCursor`.

### Create Template

Create a message template (MARKETING, UTILITY, or AUTHENTICATION) for Meta review, with positional or named variables and text, media, or location headers.

### Update Template

Edit an approved, rejected, or paused template by its ID, for example to fix a rejected template and resubmit it. The provided components replace all existing components.

### Delete Template

Delete a template by name (all languages) or, with a template ID, a single language version.

### Get Media URL

Retrieve a media file by its media ID as a downloadable file, together with its MIME type, size, and SHA256 hash. Use it for media received in incoming messages.

### Delete Media

Delete a media file from WhatsApp servers by its media ID.

### Mark Message as Read

Mark an incoming message (and earlier messages in the conversation) as read, optionally showing a typing indicator while you prepare a reply.

### Get Business Profile / Update Business Profile

Read or update the business profile for the configured phone number: about text, address, description, email, websites, industry vertical, and profile picture.

### List Phone Numbers / Get Phone Number

List the phone numbers in your WhatsApp Business Account, or read one, with verified names, display numbers, quality ratings, and verification status.

### Register Phone Number

Register a phone number for the Cloud API with its two-step verification PIN.

## Chat

WhatsApp is also available as a normalized chat provider. A connection represents one business phone number: it appears as a single workspace whose ID is the configured Phone Number ID. Each customer conversation is a direct-message channel whose ID is the customer's WhatsApp ID (their phone number in international format, digits only). When Meta omits the phone number for a customer who uses a WhatsApp username, the channel ID is the customer's business-scoped user ID (for example `US.13491208655302741918`) and messages are addressed to it with the `recipient` field.

### Supported actions and events

| Capability | Support | Notes |
| --- | --- | --- |
| Send message | Native | Markdown is rendered to WhatsApp formatting (`*bold*`, `_italic_`, `~strike~`, code, lists, quotes). Tables, charts, fields, and cards use plain-text fallbacks. Limit 4096 characters. Free-form messages require an open 24-hour customer service window; a closed window is reported as a "direct messages not allowed" error. |
| Reply to a message | Native | `reply.id` sends a contextual reply that quotes the original message. WhatsApp has no threads, so `threadId` is rejected. |
| Mark message read | Native | Sends a read receipt for an incoming message (within 30 days). |
| Add / remove reaction | Native | Unicode emoji only. WhatsApp keeps one reaction per message, so removing clears whichever reaction is set. |
| Upload file | Native (sends a message) | Uploads the media and immediately sends it to the conversation as an image, video, audio, or document message (other types, including WebP, are sent as documents), returning both the file reference and the created message. Size limits: images 5 MB, audio/video 16 MB, documents 100 MB. |
| Download file | Native | Uses the media ID from a message attachment. Returns a downloadable file at an authenticated Meta media URL that is reissued automatically after it expires (5 minutes). Inbound media IDs stay valid for 7 days. |
| Workspaces / authenticated identity | Native | The configured business phone number with its verified name and display number. |
| Get channel | Documented fallback | Derived from the customer ID; WhatsApp has no conversation or contact lookup, so no name is returned unless it arrived on an inbound message. |
| Setup instructions | Native | Available before connecting; covers the Meta app, system user token, and webhook steps. |
| Message received (event) | Native | Text, image, video, audio, document, sticker, location, contacts, button and list replies, template quick-reply buttons, and orders. Media arrive as attachments with a `{ mediaId }` file reference; captions become text. |
| Reaction added / removed (events) | Native | WhatsApp does not report which emoji was removed, so a removal carries an empty emoji value; the original payload is preserved. |

### Not supported

- **Edit and delete messages**: the Cloud API cannot edit or delete messages sent by a business.
- **Typing indicators**: WhatsApp shows a typing indicator only as part of a read receipt for a specific incoming message, and the normalized typing action does not carry a message ID.
- **Ephemeral messages, threads, slash commands, mentions**: no WhatsApp equivalent.
- **Message history, search, channel and member listing, user lookup, opening DMs**: the Cloud API has no read APIs for conversations or contacts.
- **Message edited / deleted events**: Meta's edit and revoke webhooks are limited to WhatsApp Business app (coexistence) numbers, and edits are currently delivered as unsupported messages.
- **Group conversations**: messages from the Groups API are acknowledged without events.
- **Delivery status events**: sent/delivered/read/failed statuses are acknowledged without events. A send that succeeds can still fail later (for example, outside the customer service window); that failure is only reported by status webhooks.

### Receiving events

Events arrive through a webhook you configure in the [Meta App Dashboard](https://developers.facebook.com/apps):

1. Create the webhook registration and enter your Meta app's **App Secret** (App settings > Basic) and a **Verify token** of your choosing. Save it first: Meta verifies the callback URL immediately.
2. In **Use cases > Connect with customers through WhatsApp > Customize > Step 2. Production setup > Configure Webhooks**, set the **Callback URL** to the registration's URL and the **Verify token** to the same value, then **Verify and save**.
3. In the **Webhook fields** list that appears after saving, subscribe to **messages**. Subscribe the app to your WhatsApp Business Account (`POST /<WABA_ID>/subscribed_apps`) and confirm it with `GET`; dashboard setup can leave only Meta's own test app subscribed.
4. Publish the app (it needs a privacy policy URL). Unpublished apps receive only dashboard test webhooks, not real messages. A Meta test number replies only to numbers on its recipient list.

Every request is verified with the `X-Hub-Signature-256` HMAC of the raw body. Each event is routed to the connection whose Phone Number ID matches the delivery's `metadata.phone_number_id`. Events are deduplicated on the WhatsApp message ID (`wamid`); reaction events also include the emoji and timestamp, because Meta can reuse the reaction message ID for a removal. Example message event output:

```json
{
  "type": "chat.message.received",
  "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5OUFFRTAzODEwMTQ0RgA=",
  "message": {
    "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5OUFFRTAzODEwMTQ0RgA=",
    "channelId": "16505551234",
    "author": { "userId": "16505551234", "userName": "16505551234", "fullName": "Sheena Nelson", "type": "user", "isMe": false },
    "body": { "parts": [{ "type": "text", "content": "Does it come in another color?" }] },
    "metadata": { "sentAt": "2025-06-08T20:59:43.000Z", "edited": false }
  },
  "channel": { "id": "16505551234", "workspaceId": "106540352242922", "type": "dm", "name": "Sheena Nelson" }
}
```

See Meta's [messages webhook reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages) for the underlying payloads.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
