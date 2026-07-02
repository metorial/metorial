Now let me get more details on the authorize route parameters and the Trello API features:Now let me get the Trello REST API reference to understand the full feature set:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Trello

## Overview

Trello is a web-based project management and collaboration tool built around boards, lists, and cards. It is owned by Atlassian and provides a REST API for programmatically managing workspaces, boards, lists, cards, members, and related resources. The API is at version 1, accessible via `https://api.trello.com/1/`.

## Authentication

Trello supports two authentication methods. Both require an API key, which is obtained by creating a Power-Up at `https://trello.com/power-ups/admin` and generating a key from the API Key tab.

### Method 1: Trello Authorize Route (Token-Based)

There are two ways to authorize a client and receive a User Token. The first is via the `1/authorize` route.

1. Direct the user to: `https://trello.com/1/authorize?expiration={expiration}&scope={scope}&response_type=token&key={YourAPIKey}`
2. The user clicks "Allow" and a token is generated.
3. Use that token and your API key to make requests to the Trello API, e.g. `https://api.trello.com/1/members/me/?key={yourAPIKey}&token={yourAPIToken}`.

**Parameters for the authorize route:**

| Parameter         | Values                                      | Description                                                                                                         |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `key`             | API key                                     | Your application's API key                                                                                          |
| `scope`           | Comma-separated: `read`, `write`, `account` | `read`: read boards, orgs, etc. `write`: create/update resources. `account`: access member email, write member info |
| `expiration`      | `1hour`, `1day`, `30days`, `never`          | Token lifetime                                                                                                      |
| `response_type`   | `token`                                     | Returns the token directly in the browser                                                                           |
| `callback_method` | `postMessage` or `fragment`                 | How the token is returned (use with `return_url`)                                                                   |
| `return_url`      | Valid URL                                   | Where to redirect after authorization (must match allowed origins)                                                  |

### Method 2: OAuth 1.0

The Trello API supports basic OAuth 1.0 using the following URLs:

- Request Token: `https://trello.com/1/OAuthGetRequestToken`
- Authorize Token: `https://trello.com/1/OAuthAuthorizeToken`
- Access Token: `https://trello.com/1/OAuthGetAccessToken`

You'll also need your application secret (used to sign your requests), listed in the API Key tab on your Power-Up management page.

### Passing Credentials in Requests

Credentials (API key + token) can be passed in three ways:

1. **Query parameters**: `?key={apiKey}&token={apiToken}`
2. **Authorization header**: `OAuth oauth_consumer_key="{apiKey}", oauth_token="{apiToken}"`
3. **PUT/POST body**: Include `key` and `token` fields in the JSON body

### Important Notes

- Tokens should always be securely stored as they grant access to the user's entire account. It is ok for your API key to be publicly available, but a token should never be publicly available.
- Allowed origins must be configured on the Power-Up admin page for redirect-based flows to work.

## Features

### Board Management

Create, read, update, and delete boards. Boards are where the majority of work happens. Trello boards can have multiple members, can belong to a user (private boards) or a Workspace (organization boards), and may have any number of lists. Manage board settings, preferences, permissions, starred status, and Power-Ups enabled on a board.

### List Management

Create and manage lists within boards. Lists represent columns on a board (e.g., "To Do", "In Progress", "Done"). Lists can be reordered, archived, and unarchived.

### Card Management

Cards are the fundamental unit in Trello, and they only exist within the context of boards. Create, update, move, and delete cards. Cards support:

- Descriptions, due dates, and start dates
- Assigning members
- Adding labels
- File attachments
- Cover images
- Positioning within and across lists

### Checklists

Create and manage checklists on cards. Add, update, remove, and reorder checklist items. Mark items as complete or incomplete.

### Labels

Create, update, and delete labels on boards. Assign labels to cards for categorization. Labels have names and colors.

### Custom Fields

Define custom fields on boards and set values on individual cards. Supports multiple field types (text, number, date, dropdown, checkbox).

### Members and Organizations (Workspaces)

Manage workspace members, retrieve member profiles and boards. Invite or remove members from boards and workspaces. Member emails can only be accessed when the `account` scope is requested, and the token can only access the email of the user who granted access.

### Enterprise Management

For Trello Enterprise users, manage enterprise-level members, organizations, and settings.

### Search

The Trello API offers the ability to search all the actions, boards, cards, members, and organizations. Search supports filtering by model type and querying across a user's accessible content.

### Actions (Activity Log)

Retrieve the activity history (actions) on boards, cards, lists, and organizations. Actions represent events such as card creation, movement, comment additions, etc. The API limits Action queries to 1000 at a time. Actions can be queried at the Board or at the Card level.

### Notifications

Retrieve and manage a member's notifications. Mark notifications as read or unread.

### Attachments

Upload and manage file attachments on cards. Supports both file uploads and URL attachments.

### Comments

Add, update, and delete comments on cards.

### Emoji

Retrieve available emoji for use in reactions.

## Events

Trello supports webhooks for real-time event notifications.

### Webhook Model

Webhooks provide a way for application developers to receive notifications when a model changes. You need the id of a model to watch. This can be the id of a member, card, board, or anything that actions apply to. Any event involving this model will trigger the webhook.

To create a webhook, you specify:

- **`callbackURL`** (required): The URL Trello will POST event data to. The provided callbackURL must be a valid URL during creation. Trello runs a quick HTTP HEAD request on the URL, and if a 200 status code is not returned, the webhook will not be created.
- **`idModel`** (required): The ID of the Trello model (board, list, card, member, organization) to monitor.
- **`description`** (optional): A human-readable description of the webhook.

### Event Categories

Webhooks are scoped to a model and fire for any action that affects that model:

- **Board events**: Card created, updated, moved, archived, or deleted; list created, updated, archived; members added/removed; board settings changed; labels modified; Power-Up changes.
- **Card events**: Card updated (name, description, due date, etc.), comments added, attachments added/removed, checklist changes, member assignments, label changes.
- **List events**: Cards added or removed, list renamed, list archived/unarchived.
- **Member events**: Boards added/removed, notifications, organization membership changes.
- **Organization (Workspace) events**: Members added/removed, boards created/removed, settings changed.

When a model with a webhook changes, the update is fired via an HTTP POST request from Trello to the URL provided. The body of the post will be a JSON payload of the action (the action that changed the model), and the updated model.

### Considerations

- Trello will disable webhooks that experience consecutive failures for 30 days without a successful sending. There are two types of failures: callback endpoint failure to respond (e.g. 400s, 500s) and the webhook's token losing access to the model.
- Webhooks belong to tokens and can only monitor objects that the token can access.
- Trello sends a `X-Trello-Webhook` header with a base64-encoded HMAC-SHA1 digest for verifying webhook authenticity.
