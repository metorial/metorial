Now let me get the full Swagger/OpenAPI spec to understand all available endpoints:Now I have enough information to compile the specification.

# Slates Specification for Botstar

## Overview

BotStar is a chatbot development platform that allows businesses to design, build, and deploy chatbots on websites and Facebook Messenger using a visual flow editor. It offers features like managing media-rich content with a built-in content management system and collecting user's data to send to other CRM systems. It supports multilingual chatbots in up to 170 languages.

## Authentication

BotStar uses two different authentication mechanisms depending on which API is being used:

### Public API (Account-Level)

Botstar uses API keys for authentication. For the Public API (base URL: `https://apis.botstar.com/v1/`):

- Go to `app.botstar.com/account/profile` to get the API token.
- The token is passed as a Bearer token in the `Authorization` header: `Authorization: Bearer <API_TOKEN>`.
- This token is account-level and provides access to manage bots and CMS entities.

### Broadcast/Messages API (Bot-Level)

BotStar authenticates calls to the Broadcast API via an API Access Token to identify which bot is being referred to. Obtain this token in the Settings page of your bot.

- The token is passed as a query parameter: `https://api2.botstar.com/broadcast?token=BotStar_Access_Token`
- This is a per-bot token, different from the account-level API token.

### Livechat Widget

For the website chat widget, an `appId` is used to initialize the widget in the browser. This is a client-side identifier, not a secret.

## Features

### Bot Management

Retrieve and list all chatbots associated with your account. Use the `/bots` endpoint to get all bots, each bot will contain a bot ID. Bot IDs are needed to interact with other API resources like users and CMS.

### Message Broadcasting

BotStar allows bot owners and collaborators to interact with the API for sending messages. You can send messages to specific users of your chatbot by specifying a user ID and message content. Supported message formats include text messages. Messages are sent via the `api2.botstar.com/broadcast` endpoint using a bot-specific access token.

- Requires a valid `userId` (the recipient) and a `messages` array.
- You need to ensure compliance with the messaging policies for the Messenger Platform.

### CMS (Content Management System)

CMS is one of the special features by BotStar. With CMS, you can create and manage digital content for your bots. CMS also allows your customers to browse your products on chatbots easily.

- CMS is composed of Entities and Items: an Entity is a set of items that share the same attributes (fields), and an Item is a data object with attributes defined and grouped by Entity.
- The API allows retrieving CMS entities and entity items using their respective IDs.
- CMS supports multiple languages.

### User/Audience Management

Access and manage your chatbot's audience data. Users can be identified by their User ID, visible in the Reports & Insights section. You can add custom fields to specific users and attach tags to them based on their actions.

### Livechat Widget API

BotStar's Website Chat Plugin provides the easiest way for your website to open an engagement channel with your visitor. The JavaScript SDK allows you to:

- Initialize and reinitialize the widget with user data.
- Show and hide the chat window programmatically.
- Update user details on the current user by calling the update method with a JSON object.
- Set user variables and direct users to specific blocks in the conversation flow.
- You can call the update method up to 20 times per 30 minutes before being throttled.

## Events

BotStar supports webhook-based event subscriptions that can be configured through the Bot Builder's Integrations settings. In BotStar, go to Bot Builder > Integrations, select an event type you want to receive data back, and paste the webhook endpoint URL.

BotStar currently supports the following event triggers:

### New Checkpoint Record

Triggers when a user reaches a checkpoint in the chatbot flow. Checkpoints are data collection points in the conversation where user-provided information is saved. You can configure which specific checkpoint to listen to.

### New Subscriber

Triggers when a user subscribes to receive broadcast messages from the chatbot.

### Updated User Attribute

Triggers when a specified user attribute has been added or updated in the audience. You can select which attribute to monitor.

### New Request for Human Takeover

Triggers when a user requests to contact a human operator.

### New Tag on User

Triggers when a new tag is added to a user.

### New CMS Item

Triggers on new CMS items. Fires when a new item is created in a CMS entity.

### User Capture Response

Triggers when a user meets a User Capture Response Block. Fires when users provide input at a capture point in the chatbot flow.

All webhook events support two environment modes: **Live** (data from real users on live platforms) and **Test** (data generated via local testing/preview in BotStar).
