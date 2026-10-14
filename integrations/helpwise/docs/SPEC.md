# Helpwise API notes

The [official developer portal](https://helpwise.io/developers) redirects to [Helpwise's Postman reference](https://documenter.getpostman.com/view/29744652/2s9YC5yYKf).

## Authentication and versions

Obtain the API key and API secret at <https://app.helpwise.io/settings/api>.

- V1: `https://apis.helpwise.io`, using HTTP Basic authentication with the API key as username and API secret as password.
- V0: `https://app.helpwise.io/dev-apis`, using `Authorization: API_KEY:API_SECRET`.

The saved credential format remains `API_KEY:API_SECRET`; the client constructs the appropriate header for each API. The authenticated identity endpoint is V0 `POST /users/me`.

## Documented workflows

| Workflow | Endpoint and request |
| --- | --- |
| Discover inboxes | V0 `POST /mailboxes/list` with `page`, `limit`; `POST /mailboxes/get` with numeric `id` |
| Discover users | V0 `POST /users/list`, with optional `mailboxId` mapped to `mailbox_id`; `POST /users/me` |
| List conversations | V1 `GET /conversations` with `inboxIds[]`, `labelId`, `limit`, `pageToken`; response `threads`, `nextPageToken` |
| Get conversation | V1 `GET /inboxes/{inboxId}/conversations/{conversationId}` with `labelId`, `limit`, `pageToken`; response includes `items` and `nextPageToken` |
| Close or delete conversations | V1 `PUT /conversations/action/close` or `/delete` with numeric `ids`; fewer than 100 IDs per request |
| List and search contacts | V1 `GET /contacts` with `limit`, `offset`; `GET /contacts/search` with `term`, `limit`, `offset`. List uses `results`, search uses `result`; both expose `nextPage` |
| Get/create/update contact | V1 `GET /contacts/{id}`, `POST /contacts`, `PUT /contacts/{id}`. Existing `name` maps to `firstname`, `email` to `emails`, and `phone` to `phones` entries containing `phoneTxt`, `phoneNo`, `type` |
| Read tags | V1 `GET /tags`, `GET /tags/{id}` |
| Apply or remove tags | V1 `POST /tags/apply` or `/tags/remove`, with numeric `threadIds`, `tagIds` |
| List emails | V0 `POST /emails/list` with numeric `mailboxId`, `threadId`, and optional `page`, `limit` |
| Send email | V0 `POST /emails/send_mail` with numeric `mailbox_id`, `to`, `subject`, `body`, and optional `cc`, `reply_to` |
| Add a note | V0 `POST /notes/add` with `thread_id`, `mailbox_id`, `message` |

For current conversation calls provide `mailboxId` from `list_mailboxes`. List filters without a V1 equivalent (query, tag, status other than closed, numbered pages above 1), or calls without `mailboxId`, retain the previous route. New `pageToken` and `labelId` fields cannot be combined with those legacy modes. Contact `offset` takes precedence over `page`; a supplied page uses a limit of 20 unless explicitly overridden.

## Compatibility and verification limits

Existing tool keys and input field types remain available. The following existing routes are retained but have no confirmed contract in the retrieved official collection: mailbox writes, teams, contact deletion, note list/delete, tag update/delete, templates, webhook management, and legacy conversation retrieval/filtering. Omission from the reference does not establish that these endpoints have been removed.

Email BCC and thread replies retain the previous `/dev-apis/v1/messages` route; their payloads are not documented in this collection. The new `replyTo` input applies to documented new-email calls without BCC or a conversation ID. Inbox-scoped user discovery should supply `mailboxId`; the user-list entry provides an example payload without a required-field declaration. V0 note creation explicitly requires `mailbox_id`, `thread_id`, and `message`; provide `mailboxId` to use it. Note creation without `mailboxId` retains the previous `/dev-apis/v1/conversations/{id}/notes` route for existing connections.

This refresh is checked against public documentation and the package build. Authenticated provider behavior, provider response variants for V0 endpoints, and account/plan availability have not been verified.
