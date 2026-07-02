Now let me look at the actual Heartbeat API documentation to understand the full scope of available endpoints.Let me get the actual API documentation and the MCP server tool list for a complete picture.Now let me fetch the actual API docs page to see the full endpoint list.Now I have enough information to write the specification. Let me compile everything I've learned.

# Slates Specification for Heartbeat

## Overview

Heartbeat (heartbeat.chat) is an online community platform that allows creators and organizations to host conversations (threads and chats), events, courses, documents, and member directories in a single branded space. It supports monetization through memberships, course sales, and events. The platform provides a REST API (v0) for programmatic community management, along with webhook support for event-driven integrations.

## Authentication

Heartbeat uses **API key-based authentication** via Bearer tokens.

- Go to **Settings > API Keys** in your Heartbeat admin panel and click **Create New API Key**.
- API access may be limited to certain plan tiers (e.g., the Business plan).
- The API key is passed in the `Authorization` header as a Bearer token:
  ```
  Authorization: Bearer <your_api_key>
  ```
- The API base URL is `https://api.heartbeat.chat/v0/`.
- Requests should include `Accept: application/json` in the headers.

## Features

### Member Management

Allows creating, retrieving, updating, and deactivating users in a Heartbeat community. You can find existing users by email, update user information, remove users from the community (deactivation — threads, comments, and messages from the user are not removed), and reactivate previously deactivated users. You can also invite users via existing invitation links.

### Group Management

Allows creating groups and managing group membership. You can add users to groups, remove users from groups, and find existing groups by ID. When adding users to a group, there is an option to remove them from sibling groups (groups sharing a parent), useful for moving users between stages.

### Threads and Comments

Allows creating threads in specific channels. Thread content can be provided as plain text or rich text (HTML). When rich text is set, plain text is ignored. Supported HTML tags include: p, a, b, h1, h2, h3, ul, li, br. You can specify the author user for the thread; if not provided, the API key owner is used. Comments can also be created on threads. When retrieving recent posts, "recent" refers to the creation timestamp, so only the most recently created posts are returned.

### Channels

You can create new channels in your community.

### Events

You can create new events in your community. Events can be configured with a location — if Zoom is selected, a Zoom account must be integrated with Heartbeat; if Heartbeat is selected, a custom voice channel is created for the event. A list of emails can be provided to invite attendees. If the email matches an existing Heartbeat user, they are invited directly; otherwise, an event invite is sent to the email address.

### Direct Messages

You can send direct messages to community members. The direct messages endpoint (`PUT /directMessages`) accepts a text field for the message content. This can be used to build automated bots, such as AI-powered chatbots.

### Invitations

You can send invitation emails to new users to join your Heartbeat community. If a pre-approved invitation link is selected, the email is approved automatically.

## Events

Heartbeat supports **webhooks** that can be configured in the platform settings to notify external systems of community activity.

Webhooks are configured with an action type, optional filters (e.g., filtering by user ID), and a target URL. The webhook payload includes relevant context data for the event type.

### Available Webhook Event Categories

- **New User**: Triggers when a new user joins your community.
- **User Updated**: Triggers when a new user joins your community or user information is updated.
- **New Thread**: Triggers when a new thread is created. Can be filtered to a specific channel.
- **New Event**: Triggers when a new event is created.
- **Group Join**: Triggers whenever a user joins a group, including the first time they join the community.
- **Course Completion**: Triggers when a user completes a course.
- **Event RSVP**: Triggers when someone RSVPs to an event.
- **Abandoned Invitation Link**: Triggers when someone enters their information in an invitation link but does not make a purchase or create their account. Fires after 4 hours if the user still has not completed the process.
- **Direct Message**: Can be configured with action type `DIRECT_MESSAGE` and includes sender user ID, receiver user ID, chat ID, and message ID in the payload.
