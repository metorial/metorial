# SupportBee integration specification

SupportBee organizes customer support emails into shared tickets.

## Authentication

Provide the API token from your SupportBee profile and the company subdomain from your desk URL. Requests use `Authorization: Bearer <token>` and `Accept: application/json` at `https://<company>.supportbee.com`. The subdomain remains connection configuration because users already know their desk address.

## Ticket workflows

List and search tickets with pagination. `perPage` must be between 1 and 99, and `page` must be a positive whole number. Listing supports archive, spam, trash, reply count, assignment, label, requester email, and time filters. Date filters use last activity by default; `sortBy=creation_time` changes them to creation time.

Create tickets with a subject, requester email, and plain-text, HTML, or uploaded attachment content. Optional requester name, CC/BCC recipients, uploaded attachment IDs, requester notification, and forwarding address ID map to documented ticket fields. Creation accepts the documented bare ticket response and a wrapped ticket response.

Retrieve tickets, send replies, add internal comments, manage labels and lifecycle status, and assign agents or teams. When assigning both, the team is set first because changing teams can remove the current user assignment. The user must belong to the selected team. Ticket deletion requires admin access and a trashed ticket. Replying on behalf of another agent requires admin access.

## Discovery and operations

`list_agents` discovers user and team IDs; `get_user` retrieves an agent, customer, or customer group. `list_emails` discovers forwarding address IDs and destinations for ticket creation. `get_ticket_audit` returns ticket action history, actor names, and timestamps. Manage reusable response snippets and retrieve admin-only response-time, ticket-count, and reply-count reports.

Ticket, reply, and comment results retain provider attachment metadata. This integration does not expose an attachment upload or download tool. No dedicated current-user endpoint is established by the current reference; user lookup requires an explicit ID.

## API reference

- https://supportbee.com/docs/api/api
- https://supportbee.com/docs/api/reference
