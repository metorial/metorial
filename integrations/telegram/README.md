# <img src="https://provider-logos.metorial-cdn.com/telegram-logo.svg" height="20"> Telegram

Send, edit, delete, forward, and pin messages in private chats, groups, supergroups, and channels. Support text, photo, video, audio, document, and sticker messages with rich formatting (HTML, Markdown) and interactive keyboards. Handle inline queries to provide rich search results directly in any chat. Manage chat members (kick, ban, unban), edit chat settings and permissions, create and manage invite links, and handle join requests. Process payments and invoices using Telegram Stars or third-party payment providers. Create, edit, and delete sticker and custom emoji packs. Serve HTML5 games with score tracking. Launch interactive Mini Apps (Web Apps) within chats. Integrate with business accounts to manage and reply to messages on behalf of businesses. Create and manage polls and quizzes. Upload and download files. Receive real-time webhook events for messages, reactions, chat membership changes, payment queries, poll updates, inline queries, business account events, and chat boosts.

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

Retrieve file information and a download URL for a file shared in Telegram. Use the file_id from a received message to get the download link.

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

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
