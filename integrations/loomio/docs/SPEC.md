# Loomio Integration

Loomio helps groups discuss issues, vote on proposals, and reach decisions.

## Authentication and instance

Use a per-user API key from the signed-in [API access page](https://www.loomio.com/profile/api_access). Requests use `Authorization: Bearer <key>` against `/api/b2` on the configured Loomio instance. Hosted connections default to `https://www.loomio.com`; self-hosted connections may supply their own base URL. Actions use the account's existing permissions. Instance-administrator status does not expand group access.

## Capabilities

- `list_groups` discovers active memberships, group IDs, names, subgroup parents, and whether the group subscription is enabled. The endpoint returns all matching groups without pagination.
- `create_discussion`, `get_discussion`, and `update_discussion` create, retrieve, and edit discussion context. Markdown and HTML are supported. Creation may include recipient IDs, emails, audience, and an invitation message.
- `list_discussions` reads a group's discussions with `open`, `closed`, or `all` status, plus `limit` and `offset` pagination. Loomio requires `groupId`; the tool keeps that input optional for schema compatibility and reports a validation error when omitted.
- `create_comment` posts text to an existing discussion as the API-key user.
- `create_poll` and `get_poll` support proposals, polls, counts, score voting, ranked choice, meetings, and dot voting. Creation sends the documented `options` array. An omitted closing time creates a work-in-progress poll with voting disabled. Optional invitation messages and closing-soon reminders are supported.
- `list_polls` reads a group's `active`, `closed`, or `all` polls with `limit` and `offset`. The existing `discussionId` filter is preserved by resolving the discussion's group and filtering the returned group page. Pagination occurs before that filter; advance the offset to check later group pages. A total count is returned only for unfiltered group results when supplied by Loomio.
- `manage_memberships` invites email addresses and optionally removes absent members. This requires group-administrator permission. The response contains added and removed email addresses.

Read outputs retain their existing field types. Missing or null optional provider fields are omitted, while unexpected response envelopes report a provider error rather than returning empty summaries.

## Scope and limitations

The public User API has no documented self/profile endpoint, so no identity tool is added. Server-wide account administration uses the separate `/api/b3` API and is outside this integration. File exports, webhooks, triggers, and chat integrations are outside this refresh. Provider permissions apply to every request.

## Provider references

- [User API documentation](https://www.loomio.com/docs/en/user_manual/integrations/api/user-api)
- [API overview](https://www.loomio.com/docs/en/user_manual/integrations/api)
