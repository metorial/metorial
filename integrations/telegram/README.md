# <img src="https://provider-logos.metorial-cdn.com/telegram-logo.svg" height="20"> Telegram

Send, edit, delete, forward, and pin messages in private chats, groups, supergroups, and channels. Support text, photo, video, audio, document, and sticker messages with rich formatting (HTML, Markdown) and interactive keyboards. Handle inline queries to provide rich search results directly in any chat. Manage chat members (kick, ban, unban), edit chat settings and permissions, create and manage invite links, and handle join requests. Process payments and invoices using Telegram Stars or third-party payment providers. Create, edit, and delete sticker and custom emoji packs. Serve HTML5 games with score tracking. Launch interactive Mini Apps (Web Apps) within chats. Integrate with business accounts to manage and reply to messages on behalf of businesses. Create and manage polls and quizzes. Upload and download files.

## Tools

### Answer Callback Query

Respond to a callback query from an inline keyboard button press. Can show a notification or alert to the user, or open a URL. Must be called within 30 seconds of receiving the callback.

### Answer Inline Query

Respond to an inline query with a list of results. When a user types "@botname query" in any chat, the bot receives an inline query and should respond with results the user can select and send.

### Delete Message

Delete a message from a chat. The bot can delete its own messages in any chat, and can delete other users' messages in groups/supergroups if it has the appropriate admin permissions.

### Edit Message

Edit the text of a previously sent message. Works for messages sent by the bot in any chat, or inline messages. Provide either chatId + messageId, or inlineMessageId.

### Forward Message

Forward a message from one chat to another. The original sender attribution is preserved.

### Get Chat

Retrieve detailed information about a chat including its type, title, description, member count, and permissions. Works for private chats, groups, supergroups, and channels.

### Get File

Retrieve file information for a file shared in Telegram and provide it as a downloadable file. Use the file_id from a received message.

### Manage Chat Member

Manage a chat member by banning, unbanning, restricting, or promoting them. Can also retrieve a member's current status and permissions. The bot must be an admin with appropriate rights.

### Pin/Unpin Message

Pin or unpin a message in a chat. Can pin a specific message, unpin a specific message, or unpin all messages. The bot must be an admin with the appropriate pin permission.

### Send Invoice

Send a payment invoice to a user or chat. Supports Telegram Stars and third-party payment providers. Can also generate a shareable invoice link instead of sending directly.

### Send Media

Send a photo, document, audio, or video message to a chat. Provide a URL or file ID for the media. Supports captions with formatting.

### Send Message

Send a text message to a Telegram chat, group, supergroup, or channel. Supports HTML and Markdown formatting, inline keyboards with callback buttons or URLs, and replying to specific messages.

### Send Poll

Create and send a poll or quiz to a chat. Supports regular polls with optional multiple-answer mode, and quiz-mode polls with a single correct answer and explanation.

### Stop Poll

Stop a live poll in a chat, freezing its current results. Once stopped, no more votes can be cast.

### Update Chat

Update a chat's title, description, or create an invite link. The bot must be an admin with the appropriate permissions.

## Chat adapter

The bot token connection also powers the normalized chat interface. Telegram has no
workspaces, so each bot is exposed as one workspace (`telegram-bot-<bot id>`) and every
chat the bot belongs to is a channel in it.

| Capability | Support | Notes |
| --- | --- | --- |
| Send, edit, delete messages | Native | Markdown and structured parts render as Telegram HTML. Replies and forum topics are supported. Editing a media message updates its caption. |
| Add / remove reactions | Native | Bots hold one reaction per message: adding replaces the bot's reaction and removing clears it. |
| Get channel | Native | Chat details, description, and member count. |
| Workspace list / get, authenticated user | Native | One workspace for the bot. |
| Typing indicator | Native | Shown for up to five seconds or until the bot's next message; works without a thread. |
| File upload | Native | Each file is sent as its own message (photo, video, audio, or document, up to 50 MB) and both the file and the new message are returned. |
| File download | Native | By file reference, up to 20 MB, delivered as a downloadable file. |
| Command list | Native | Commands registered for the default scope. |
| Setup instructions | Native | BotFather steps and a pasteable command list; available before connecting. |
| Message received / updated, mention, command | Native | Includes channel posts. Album items share a group ID. A command addressed to the bot arrives only as a command, not also as a message or mention. |
| Reaction added / removed | Native | The bot must be a chat administrator. |
| Member joined / left | Native | Other members require the bot to be a chat administrator. |

Not supported, because the Bot API offers no equivalent to a bot: reading, listing, or
searching message history; ephemeral messages; read receipts; listing reactions,
channels, threads, or channel members; opening direct messages; user lookup or search;
responding to command interactions (reply with a normal message instead); and message
deletion events.

### Receiving events

Enabling events registers the bot's webhook automatically, verified with a generated
secret token. A Telegram bot can have only one webhook, so this replaces any webhook set
elsewhere for the same bot. In groups with privacy mode enabled (the default), Telegram
only delivers commands, mentions, and replies to the bot; disable privacy mode with
BotFather to receive every message. Each update is delivered once per `update_id`.
Example `message.received` output:

```json
{
  "type": "chat.message.received",
  "id": "8726620878:10000",
  "message": {
    "id": "1365",
    "channelId": "-1001234567890",
    "author": { "userId": "1111111", "userName": "tester", "fullName": "Test User", "type": "user", "isMe": false },
    "body": { "parts": [{ "type": "text", "content": "hello" }] },
    "metadata": { "sentAt": "2015-09-07T17:05:32.000Z", "edited": false }
  },
  "channel": { "id": "-1001234567890", "workspaceId": "telegram-bot-8726620878", "type": "private", "name": "Team" }
}
```

See the [Bot API update reference](https://core.telegram.org/bots/api#update).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
