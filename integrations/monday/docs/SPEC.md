Let me get the specific webhook event types and OAuth scopes from the Monday.com API docs.Now I have enough information to compile the specification. Let me also check the OAuth scopes page for the complete list.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Monday.com

## Overview

Monday.com is a work operating system (Work OS) that provides teams with boards, items, columns, and automations to manage projects, workflows, and operations. It offers products for work management, dev, sales CRM, and service. The platform exposes a GraphQL API for programmatic access to all account data.

## Authentication

Monday.com supports two authentication methods:

### 1. Personal API Token

The monday.com platform API utilizes personal V2 API tokens to authenticate requests and identify the user making the call. Personal tokens allow you to interact with the API using your own user account. Their permissions mirror what you can do in the monday.com UI, ensuring that API access is consistent with your platform-level permissions.

To obtain a token: navigate to your profile picture → Developers → API token → Show, and copy the token.

Once you have your token, you can make requests with the API by passing the token in the Authorization header.

All requests are POST requests to `https://api.monday.com/v2` with the token in the `Authorization` header and `Content-Type: application/json`.

### 2. OAuth 2.0

OAuth 2.0 is a protocol that lets your app request authorization to read or modify data in a user's monday account. At the end of the OAuth process, your app gets an access token that belongs to the user and grants access to specified permission scopes.

**Endpoints:**

- Authorization URL: `https://auth.monday.com/oauth2/authorize`
- Token URL: `https://auth.monday.com/oauth2/token`

**Credentials required:** `client_id` and `client_secret`, obtained by creating an app in the Monday.com Developer Center.

**Flow:**

1. Redirect user to authorization URL with `client_id`.
2. User approves scopes; redirected back with a temporary authorization `code` (valid for 10 minutes).
3. Exchange the code at the token URL for an access token.
4. The access token gives your app access to the monday API on behalf of the user and will be valid until the user uninstalls your app. There are no refresh tokens.

**Optional parameters:** `subdomain` can be specified to target a specific account for users who belong to multiple accounts.

**Supported OAuth Scopes:**

| Scope                 | Description                                       |
| --------------------- | ------------------------------------------------- |
| `account:read`        | Read general information about the account        |
| `assets:read`         | Read data from assets the user has access to      |
| `boards:read`         | Read a user's board data                          |
| `boards:write`        | Modify a user's board data                        |
| `docs:read`           | Read a user's docs                                |
| `docs:write`          | Modify a user's docs                              |
| `me:read`             | Read a user's profile information                 |
| `notifications:write` | Send notifications on behalf of the user          |
| `tags:read`           | Read the account's tags                           |
| `teams:read`          | Read information about the account's teams        |
| `teams:write`         | Modify the account's teams                        |
| `updates:read`        | Read updates and replies the user can see         |
| `updates:write`       | Post or edit updates on behalf of the user        |
| `users:read`          | Read profile information of the account's users   |
| `users:write`         | Modify profile information of the account's users |
| `webhooks:read`       | Read existing webhooks configuration              |
| `webhooks:write`      | Create and modify webhooks                        |
| `workspaces:read`     | Read a user's workspaces data                     |
| `workspaces:write`    | Modify a user's workspaces data                   |

## Features

### Board Management

Create, read, update, and delete boards. Boards are the primary containers in Monday.com, analogous to spreadsheets or project boards. You can manage board settings, templates, and board views. The platform API currently supports the monday work management, dev, sales CRM, and service products. It currently does not support Workforms.

### Item and Sub-item Management

Create, read, update, and delete items (rows) within boards. Items represent individual work entries. You can also manage sub-items, which are nested items under a parent item. Items can be moved between groups and boards.

### Column and Column Value Management

Manage board columns (fields) and their values on items. Monday.com supports a wide variety of column types including status, date, people, text, numbers, timeline, dropdown, checkbox, email, phone, location, files, formulas, and many more. You can create columns, update column values for individual items, and change multiple column values at once.

### Groups

Create, read, update, and delete groups within boards. Groups are used to categorize and organize items into sections within a board.

### Updates and Replies

Post updates (comments/discussions) on items and reply to existing updates. Updates serve as a communication thread attached to specific items.

### Users and Teams

Read user profiles and team information within the account. Manage team membership. User data includes profile details like name, email, and role.

### Workspaces

Create and manage workspaces, which are organizational containers that hold boards and other resources. Workspaces help separate different departments or projects.

### Documents (Docs)

Create, read, and manage Monday Workdocs. Docs support block-based content (text, tables, images, etc.) and can be exported as Markdown.

### Folders

Organize boards into folders within workspaces for better structure and navigation.

### Notifications

Send notifications to users on behalf of the authenticated user, targeting specific items.

### File/Asset Management

Upload and manage files attached to items or updates. File uploads use multipart requests rather than the standard JSON body.

### Tags

Read and manage tags used to label and categorize items across boards.

### Dashboards and Widgets

Query dashboards and their associated widgets for reporting and visualization purposes.

### Webhooks

Create and manage webhook subscriptions on boards to receive real-time notifications when specific events occur. Webhooks are scoped to individual boards.

### Activity Logs

Query activity log data on boards to see a history of changes and actions performed.

## Events

Monday.com offers the ability to send a Webhook via integrations, or create them via the API. You can send a Webhook each time a chosen event occurs within your board. Whenever you try to create a new Webhook on monday.com, they send a JSON challenge to the URL you provide to verify you have control over the endpoint.

Webhooks are created per board via the `create_webhook` GraphQL mutation, specifying the board ID, target URL, and event type.

### Item Events

- **Item created** (`create_item`): Fires when a new item is created on the board. The payload includes the item name, group, and board information but column values are empty.
- **Sub-item created** (`create_subitem`): Fires when a sub-item is created. Payload includes the parent item ID.

### Column Value Change Events

- **Any column value changed** (`change_column_value`): Fires when any column value changes on any item in the board. Includes the column ID, type, new value, and previous value.
- **Specific column value changed** (`change_specific_column_value`): Fires only when a particular column changes. Requires a `config` parameter with the `columnId` to watch.
- **Sub-item column value changed** (`change_subitem_column_value`): Fires when any column value changes on a sub-item.

### Item Name Events

- **Item name changed** (`change_name`): Fires when an item's name is updated.
- **Sub-item name changed** (`change_subitem_name`): Fires when a sub-item's name is updated.

### Update/Comment Events

- **Update created** (`create_update`): Fires when an update (comment) is posted on an item. Payload includes the update body, update ID, and reply ID.
- **Sub-item update created** (`create_subitem_update`): Fires when an update is posted on a sub-item.
