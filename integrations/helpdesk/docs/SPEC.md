# HelpDesk integration

HelpDesk by Text provides support ticket management, automation, agent and team administration, reporting, and account discovery.

## Authentication

OAuth uses the Text Accounts authorization-code flow and `https://accounts.livechat.com/v2/token`, including refresh-token rotation. The requested `accounts--my:ro` scope authenticates the HelpDesk account. Personal access tokens use Basic authentication with the account ID and token from the Developers Console.

## Core ticket contract

The API base URL is `https://api.helpdesk.com`. The public status `on hold` maps to the provider status `onhold` in requests and back in responses. Public priority labels are translated to provider values: low=-10, medium=0, high=10, urgent=20. Requests use nested `assignment`, `cc` email objects, and `tagIDs`. Responses normalize `ID` to public `id`, assignment references to `teamID`/`assigneeID`, and nullable fields to optional fields.

Creating a ticket requires a requester and first `message.text`. The public `message` input is additive and enforced at invocation time. Updating a ticket and `send_ticket_message` use `PATCH /v1/tickets/{ticketID}`. Messages support public replies or private notes.

`list_tickets` uses documented filter names, `pageSize`, `order`, and composite `next.value`/`next.ID` cursor parameters. Cursors returned by this tool retain the public string type. A full page indicates that another page may exist; the next request can return no tickets.

`merge_tickets` retains the merge and unmerge modes in one top-level object schema. Merging calls `POST /v1/tickets/{ticketID}/childTickets` for each child. Unmerging discovers the specified child ticket's parent and calls `DELETE /v1/tickets/{ticketID}/childTickets/{childTicketID}`. Multi-child operations can partially complete if a later provider call fails.

Tag and follower removals use individual resource DELETE endpoints. Rating requests use `POST /v1/tickets/{ticketID}/ratingRequests`.

## Discovery tools

- `list_licenses`: GET `/v1/licenses`, identifying the connected HelpDesk account and default team.
- `list_views`: GET `/v1/views`, exposing saved view IDs, names, and filters.
- `send_ticket_message`: PATCH `/v1/tickets/{ticketID}`, adding a public message or private note.

## Sources and verification

- [HelpDesk API reference](https://api.helpdesk.com/docs)
- [Text OAuth documentation](https://platform.text.com/docs/authorization/oauth-authorization/)
- [Text scope reference](https://platform.text.com/docs/authorization/scopes)

Local schema regression and package build verification do not establish live-provider acceptance. No live E2E or eval work is part of this refresh.
