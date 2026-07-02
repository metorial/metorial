# Slates Specification for Sendbird AI Chatbot

## Overview

Sendbird AI Chatbot is a platform that allows businesses to create and deploy AI-powered chatbots within their applications, built on top of the Sendbird Chat infrastructure. It enables automated, personalized, human-like interactions by leveraging LLM backends such as OpenAI's GPT models. With Sendbird Chat API and Dashboard, you can integrate AI chatbots into your application, configure knowledge bases, define system prompts, and set up function calling for external integrations.

## Authentication

Sendbird AI Chatbot uses API token authentication for all Platform API requests.

**API Token:**

- Your API requests must be authenticated by Sendbird server using any of the API tokens from your Sendbird application. You can use the master API token found in your dashboard under Settings > Application > General > API tokens, which is generated when an application is created.
- The master API token can't be revoked or changed. Using the master API token, you can generate secondary API tokens, revoke them, or list them. For most API requests, a secondary API token can be used instead of the master API token.
- The token is passed via the `Api-Token` HTTP header on every request.

**Application ID:**

- To get the ID and the allocated base URL of your Sendbird application, sign in to your dashboard, select the application, go to Settings > Application > General, and then check the Application ID and API request URL.
- API endpoints are relative to the base URL: `https://api-{application_id}.sendbird.com/v3/bots`.
- The Application ID is case-sensitive.

**Example request header:**

```
Api-Token: {master_api_token_or_secondary_api_token}
Content-Type: application/json; charset=utf8
```

## Features

### AI Chatbot Management

Create, update, list, retrieve, and delete AI chatbots within your application. Each chatbot is created within an application, with a limit of up to 10 AI chatbots by default. When creating a bot, you configure:

- **AI backend and model**: e.g., `chatgpt` with a specific model like `gpt-4o`.
- **System message**: Defines the persona and behavior of the chatbot.
- **LLM parameters**: Temperature, max tokens, top_p, presence penalty, frequency penalty.
- **Bot identity**: User ID, nickname, profile URL, and bot type.
- **Bot callback URL**: An optional URL for receiving message callbacks when a user sends a message to the bot. If the `ai` property is specified, the bot_callback_url is no longer required but can be optionally specified.
- **Privacy mode**: Controls whether the bot receives all messages or only those directed at it.

### Knowledge Base Sources

You can manage file or URL sources that AI chatbots refer to when generating answers. Managing file or URL sources can only be done on the Sendbird Dashboard. Supported formats include PDF, text files, and URLs.

### AI Bot Reply Generation

With the AI chatbot replies API, you can generate AI chatbot responses to user messages. You send a conversation history (array of role/content message objects) and receive generated replies. A `use_streaming_response` option controls whether the response is streamed.

### Streaming Messages

The API supports sending streaming messages from the bot to a channel, allowing for a progressive, real-time display of bot responses to end users rather than waiting for the full response.

### Typing Indicators

You can programmatically start and stop typing indicators for the bot within a channel, providing a more natural conversational experience while the bot is generating a response.

### Function Calling

By leveraging function calling, the chatbot can make API requests to third-party services based on customer inquiries, then parse and present the response in a conversational manner. Functions are defined in the Sendbird Dashboard with a name, description, parameters, endpoint URL, and HTTP method. This enables use cases like appointment scheduling, order tracking, and handoff to human agents.

### Welcome Messages and Suggested Replies

The Welcome Message is the first message displayed to users by the chatbot. Along with the Welcome Message, you can set up Suggested Replies from the Dashboard. Quick replies present users with predefined response options to streamline conversations.

## Events

Sendbird supports webhooks for chat-level events that also apply to AI chatbot interactions. With webhooks turned on in your Sendbird application, your server receives HTTP POST requests from the Sendbird server containing information on all events that occur within the application. Webhooks are configured via Settings > Chat > Webhooks on the Sendbird Dashboard, and you can selectively subscribe to event categories.

Additionally, bots support a **bot callback URL** mechanism: your callback URL receives POST requests when a user sends a message to the bot, and must return a 200 OK response. Sendbird retries if it doesn't receive a 200 OK.

### Message Events

Events for messages sent, updated, or deleted in both open channels and group channels (e.g., `open_channel:message_send`, `group_channel:message_send`, `group_channel:message_update`, `group_channel:message_delete`). This includes bot messages.

### Channel Lifecycle Events

Events for channel creation, removal, property changes, and freeze/unfreeze status. Covers both open channels and group channels (e.g., `group_channel:create`, `group_channel:changed`, `group_channel:remove`, `group_channel:freeze_unfreeze`).

### Channel Membership Events

Events for user invitations, invitation declines, joins, and leaves in group channels (e.g., `group_channel:invite`, `group_channel:decline_invite`, `group_channel:join`, `group_channel:leave`). Open channels have enter/exit events.

### User Events

Events triggered when a user blocks or unblocks another user (`user:block`, `user:unblock`).

### Reaction Events

Events for when reactions are added to or removed from messages in group channels (`group_channel:reaction_add`, `group_channel:reaction_delete`).

### Message Read Events

Events for when messages are read in a group channel (`group_channel:message_read`).

### Report Events

Webhook events related to reports within your Sendbird application, including reports on messages, users, open channels, and group channels.

### Operator Events

Events triggered when operators are registered or unregistered by another operator's client app.

### Announcement Events

Events triggered when channels are created for sending an announcement and when announcement messages are sent to target channels.

### Bot Callback

A per-bot webhook mechanism where Sendbird sends an HTTP POST to the bot's configured `bot_callback_url` whenever a message is sent in a channel the bot is part of. The payload includes sender info, bot info, channel members, and the message content. This is separate from the global webhook system and is specific to bot interactions.
