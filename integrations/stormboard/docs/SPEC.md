# Slates Specification for Stormboard

## Overview

Stormboard is a collaborative digital whiteboard platform where teams can brainstorm, plan projects, and organize ideas using digital sticky notes, sections, and templates. It is an online sticky note whiteboard for brainstorming and project collaboration, helping teams organize ideas and run more productive meetings. It offers integrations with tools like Jira, Azure DevOps, Rally, Microsoft Teams, and Slack.

## Authentication

There are 2 ways to authenticate through the Stormboard v1 API.

### API Key

Your API key can be found on the API tab of your Stormboard account at https://www.stormboard.com/users/account#api.

The API key is passed via a request header:

- Header name: `X-API-Key`
- Header value: Your API key

Example:

```
X-API-Key: your_api_key_here
```

### OAuth 2.0

Stormboard also supports OAuth 2.0 authentication. However, you must contact Stormboard support to register your OAuth client. The OAuth login endpoint is at `https://api.stormboard.com/oauth2/login`. No further public documentation on scopes or flow details is available; registration and configuration details are provided upon request.

All requests that require authentication will return 403 Forbidden if authentication fails.

## Features

### Storm Management

Create, retrieve, duplicate, close, and reopen Storms (collaborative workspaces/boards). When creating a Storm, you can configure the title, description, plan type (personal or team), votes per user (0–100), whether to show real-time user avatars, and whether to show the idea creator's avatar on ideas. Team Storms require a team ID and Storm Administrator permissions.

- Storms can be closed to make them read-only and reopened later.
- You can favorite/unfavorite Storms on the dashboard.
- Storms can be duplicated to create copies of existing workspaces.

### Idea Management

Create, update, and manage ideas captured in Stormboard in real-time. Ideas (sticky notes) are the core content units within Storms. When creating an idea, you specify the Storm, type, content data, and color.

- Retrieve all ideas in a Storm or detailed data for a specific idea.
- Retrieve detailed data and metadata for a specific idea.

### Sections and Templates

- Update a section's title, description, and/or character in a Storm.
- Update the color labels of the legend for a Storm.
- Retrieve template data for a Storm including all sections and subsections.

### Connectors

Create, update, and delete line connectors between ideas to visualize relationships and dependencies.

- Update a specific line connector between two ideas.
- Retrieve a list of all connectors within a Storm.

### Tags

- Retrieve the list of tags that have been created in a Storm.
- Create new tags in a Storm and associate tag data with specific ideas.

### Chat

- Retrieve a list of chat messages from a Stormboard Storm.
- Create new chat messages, retrieve unread messages, and mark messages as read.

### Participants and Invitations

- Retrieve a list of all participants in a Storm.
- Invite people to join a Storm by email.
- Accept or decline Storm invitations.
- Join a Storm using its ID and access key.
- Check if the authenticated user has access to a Storm and retrieve their permission level.

### User Management

- Retrieve authenticated user profile information.
- Update user profile information and notification preferences.
- Create new user accounts and verify accounts using a verification code.
- Some endpoints are restricted based on plan type (Public, Team Members, or Team Owners).

## Events

Stormboard supports webhooks that can be configured from the Webhooks section of your account settings (My Account → Webhooks). When adding a webhook, you provide a Payload URL and choose which events to subscribe to — either "Send me everything" or "Let me select specific events."

The following event categories are available:

### Idea Created

- Triggered when an idea is added to a Storm.
- Includes details about the Storm, idea content, type, and the user who created it.

### Idea Deleted

- Triggered when an idea is deleted from a Storm.
- Includes details about the Storm, the deleted idea, and the user who performed the action.

### Idea Moved

- Triggered when an idea is moved to a different section of a Storm.
- Includes the destination section's character identifier and title.

### Comment Created

- Triggered when a new comment is posted on an idea.
- Includes the comment text, related Storm and idea details, and the commenting user.

### Legend Change

- Triggered when the color legend of a Storm is modified.
- Includes the updated colour and label name.
