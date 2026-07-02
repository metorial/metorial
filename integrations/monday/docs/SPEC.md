# Slates Specification for Monday.com

## Overview

monday.com is a work operating system built around boards, groups, items, columns, updates, workspaces, folders, and webhooks. This integration uses the monday.com GraphQL API and passes `API-Version: 2026-04`, the current stable API version at the time of this update.

## Authentication

The integration supports personal API tokens and OAuth 2.0.

Personal API tokens are sent in the `Authorization` header when calling `https://api.monday.com/v2`.

OAuth uses:

- Authorization URL: `https://auth.monday.com/oauth2/authorize`
- Token URL: `https://auth.monday.com/oauth2/token`

Configured OAuth scopes include account, boards, updates, users, teams, tags, workspaces, webhooks, notifications, docs, and assets scopes. Tool behavior only exposes the surfaces implemented in this package.

## Implemented Tool Coverage

### Boards

- List boards by ID, workspace, board kind, and state.
- Create boards, including current `2026-04` `empty` and `prompt` arguments.
- Update board name and description.
- Archive and delete boards.
- Duplicate boards with structure, items, or items and updates.
- Move boards by updating workspace, folder, product, or hierarchy position.

### Items and Sub-items

- Read items by ID.
- Read board items through `items_page`, including cursor pagination, group filtering, filter rules, order rules, and hierarchy scope.
- Create items and sub-items.
- Update item column values.
- Move items to groups, positions, or another board.
- Duplicate items.
- Replace item description markdown content through the `2026-04` `set_item_description_content` mutation.
- Archive, delete, and clear item updates.

### Groups

- List, create, update, archive, and delete groups on a board.

### Columns

- List columns using the current `settings` JSON field.
- Create columns with optional defaults, custom ID, and insertion point.
- Update column title or description.
- Delete columns.

### Updates

- List updates by item or update IDs.
- Create updates and replies.
- Edit update bodies.
- Like and unlike updates.
- Pin and unpin updates.
- Clear an item's updates.
- Delete updates.

### Workspaces and Folders

- List, create, update, and delete workspaces.
- List, create, update, and delete folders.

### Webhooks

- List board webhooks.
- Create board webhooks for supported event types.
- Delete webhooks.

monday.com verifies webhook URLs during creation by sending a JSON challenge to the callback URL. Private live E2E coverage therefore fixture-gates create/delete webhook scenarios behind a callback URL that can pass this challenge.

### Account Reads and Utilities

- List users, teams, tags, and board activity logs.
- Send notifications to users.

## Non-Implemented Surfaces

This package does not currently expose Workdocs, dashboards, widgets, forms, asset upload/download, automations, validations, or the `2026-07` release-candidate search API. File-producing tools are not present in this integration.

## Error Handling

Integration API, auth, and tool validation errors are wrapped in `ServiceError` from `@lowerdeck/error` for user-facing failures. GraphQL errors returned inside successful HTTP responses are also converted to `ServiceError`.

## Schema Compatibility

All tool input schemas are top-level `z.object` schemas. The package includes a schema regression test that serializes each tool input with `z.toJSONSchema(...)` and asserts the top-level schema is an object without top-level `oneOf`, `anyOf`, or `allOf`.
