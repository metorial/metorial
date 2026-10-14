# Sendbird AI Chatbot Specification

## Authentication

Use an application master or secondary API token in the `Api-Token` header. New connections store the case-sensitive Application ID with authentication. Existing connections can continue using their stored Application ID configuration. Requests use `https://api-{application_id}.sendbird.com/v3` with a 60-second timeout.

Organization APIs require a different organization credential and are not exposed. Delight AI in-app channels use `svc.delight.ai` and are outside the current hostname scope.

## Available tools

- Create, update, list, retrieve, and delete bots. Bot IDs and nicknames have an 80-character limit. Normal bots require a callback URL; compatible AI bots can instead provide AI configuration.
- Join one or more group channels or leave one/all joined channels.
- Discover joined group channels with pagination and an optional name filter, including empty and hidden channels.
- Send text messages with an optional custom type and retrieve a group-channel message by ID. The send operation returns the actual message ID and creation time.
- Start and stop bot typing indicators in group channels.
- Generate a non-streaming reply through the existing AI chatbot replies endpoint where available. Streaming mode is not supported by this tool.

Existing AI fields and the reply endpoint are retained for compatibility. Current public bot documentation does not fully describe their AI contract, so availability and AI response behavior need confirmation against an enabled application. No endpoint removal is inferred from that documentation gap.

Knowledge source management, function definitions, welcome messages, and suggested replies are dashboard workflows. The integration exposes no event triggers or streaming-message tool.

## Provider references

- [Prepare to use API](https://sendbird.com/docs/chat/platform-api/v3/prepare-to-use-api)
- [Bot overview](https://sendbird.com/docs/chat/platform-api/v3/bot/bot-overview)
- [Send a bot message](https://sendbird.com/docs/chat/platform-api/v3/bot/sending-a-bot-message/send-a-bot-message)
- [List group channels by user](https://sendbird.com/docs/chat/platform-api/v3/user/managing-joined-group-channels/list-group-channels-by-user)
- [Get a message](https://sendbird.com/docs/chat/platform-api/v3/message/messaging-basics/get-a-message)
