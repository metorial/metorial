# Slates Specification for Telegram

## Overview

Telegram is a cloud-based messaging platform that offers an HTTP-based Bot API for building automated bots. The Bot API is an HTTP-based interface created for developers keen on building bots for Telegram. Telegram Bots are special accounts that do not require an additional phone number to set up, and serve as an interface for code running somewhere on your server.

## Authentication

The Telegram Bot API uses a **Bot Token** for authentication. There is no OAuth2 flow or API key management portal — authentication is handled entirely through a single token embedded in the request URL.

**Obtaining a Bot Token:**

Start a chat with the BotFather (@BotFather) on Telegram. Enter the `/newbot` command to create a new bot. The BotFather will ask you for a name and username for your new bot. The username is a short name used in search, mentions, and t.me links. It must be between 5 and 32 characters long, is not case sensitive, may only include Latin characters, numbers, and underscores, and must end in "bot". Copy the bot token the BotFather generates and use it as the Access Token.

**Using the Token:**

Requests are made to endpoints in the format: `https://api.telegram.org/bot<token>/METHOD_NAME`. The token is included directly in the URL path, not as a header or query parameter. All queries to the Telegram Bot API must be served over HTTPS.

There are no scopes, no refresh tokens, and no expiration. The token grants full access to control the bot. A new token can be generated via BotFather, which invalidates the previous one.

## Features

### Messaging

Bots can send and receive messages of all types in private chats, groups, supergroups, and channels. This includes sending text, photo, video, audio, and document messages, as well as editing, deleting, forwarding, and pinning messages. Messages support formatting (HTML, Markdown), reply keyboards, and inline keyboards with callback buttons.

### Inline Mode

Users can interact with your bot via inline queries, straight from the text input field in any chat. Bots can respond with rich results (articles, photos, videos, etc.) that users can select and send inline into any conversation.

### Chat & Group Management

Bots can get chat information like ID, type, title, and description, manage chat members (kick, ban, unban, etc.), and edit chat settings and permissions. Bots can also create and manage invite links, approve or decline join requests, and manage forum topics in supergroups.

### Payments

Payments are seamlessly integrated into Telegram, allowing you to sell digital goods and services in exchange for Telegram Stars. You create a bot that offers goods and services to Telegram users. Merchant bots can send specially formatted invoice messages to users, groups or channels. The API also supports third-party payment providers for physical goods with shipping options.

### Stickers & Custom Emoji

Stickers and custom emoji are a distinctive Telegram feature. They range from basic images to smooth vector animations and high-detail .WEBM videos. All these formats are supported by the Bot API, which allows bots to create, edit, delete and share new artwork packs on the fly.

### Games

Bots can serve as standalone gaming platforms — with the HTML5 Gaming API you can develop multiplayer or single-player games and let your users have fun comparing ranks, scores and much more.

### Mini Apps (Web Apps)

Bots can offer users interactive HTML5 mini apps to completely replace any website. Bots can install attachment menu entries, offering conveniently accessible, versatile web apps.

### Business Account Integration

Business users can connect Telegram bots that will process and answer messages on their behalf. This allows businesses to seamlessly integrate any existing tools and workflows, or add AI assistants that manage their chats. Bots receive updates about messages in managed business chats and can reply on behalf of the business owner.

### Polls

Bots can create polls and quizzes, stop polls, and get poll results.

### File Handling

Bots can send and receive files (documents, photos, audio, video). Bots can download files shared in chats and upload files to send in messages.

### Telegram Login Widget

Bots can connect to Telegram using the Web Login functionality, allowing websites to authenticate users via their Telegram account.

## Events

Telegram supports webhooks for receiving real-time updates. Telegram supports two ways of processing bot updates: getUpdates (pull) and setWebhook (push). Whenever there is an update for the bot, Telegram sends an HTTPS POST request to the specified URL, containing a JSON-serialized Update.

Webhooks are configured via the `setWebhook` method. You can specify which types of updates you want to receive via webhook using the `allowed_updates` parameter, which allows you to subscribe to specific event types. You can specify a `secret_token` parameter, and the request will contain a header "X-Telegram-Bot-Api-Secret-Token" for verification. Webhooks require SSL/TLS encryption.

The following event categories can be received:

### Messages

- **message** — New incoming message of any kind — text, photo, sticker, etc.
- **edited_message** — New version of a message that is known to the bot and was edited.
- **channel_post** — New incoming channel post of any kind.
- **edited_channel_post** — New version of a channel post that is known to the bot and was edited.

### Business Account Events

- **business_connection** — The bot was connected to or disconnected from a business account, or a user edited an existing connection with the bot.
- **business_message** — New message from a connected business account.
- **edited_business_message** — New version of a message from a connected business account.
- **deleted_business_messages** — Messages were deleted from a connected business account.

### Inline & Callback Queries

- **inline_query** — New incoming inline query.
- **chosen_inline_result** — The result of an inline query that was chosen by a user and sent to their chat partner.
- **callback_query** — New incoming callback query.

### Payments

- **shipping_query** — New incoming shipping query. Only for invoices with flexible price.
- **pre_checkout_query** — New incoming pre-checkout query. Contains full information about checkout.
- **purchased_paid_media** — A user purchased paid media with a non-empty payload sent by the bot in a non-channel chat.

### Polls

- **poll** — New poll state. Bots receive only updates about stopped polls and polls which are sent by the bot.
- **poll_answer** — A user changed their answer in a non-anonymous poll. Bots receive new votes only in polls that were sent by the bot itself.

### Chat Membership

- **my_chat_member** — The bot's chat member status was updated in a chat. For private chats, this update is received only when the bot is blocked or unblocked by the user.
- **chat_member** — A chat member's status was updated in a chat. The bot must be an administrator in the chat and must explicitly specify "chat_member" in the list of allowed_updates to receive these updates.
- **chat_join_request** — A request to join the chat has been sent. The bot must have the can_invite_users administrator right in the chat to receive these updates.

### Reactions

- **message_reaction** — A reaction to a message was changed by a user. The bot must be an administrator in the chat and must explicitly specify "message_reaction" in the list of allowed_updates to receive these updates.
- **message_reaction_count** — Reactions to a message with anonymous reactions were changed. The bot must be an administrator in the chat and must explicitly specify "message_reaction_count" in the list of allowed_updates to receive these updates.

### Chat Boosts

- **chat_boost** — A chat boost was added or changed. The bot must be an administrator in the chat to receive these updates.
- **removed_chat_boost** — A boost was removed from a chat. The bot must be an administrator in the chat to receive these updates.
