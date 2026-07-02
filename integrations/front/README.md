# <img src="https://provider-logos.metorial-cdn.com/front.svg" height="20"> Front

Manage shared inboxes and team-based communication across email, SMS, chat, and social media. Create, reply to, and manage conversations including assignment, tagging, archiving, and moving between inboxes. Send messages, create drafts, and import historical messages. Manage contacts, accounts, and contact groups with custom fields and handles. Add internal comments and mentions for team collaboration. Create and organize tags with hierarchical structures. Configure and manage channels connecting external messaging platforms. Create and manage knowledge base articles and categories. Export analytics data on team performance and response times. Manage message templates, teammate shifts, email signatures, and automation rules. Listen for real-time webhook events on conversation assignments, inbound/outbound messages, tagging changes, and conversation lifecycle updates.

## Tools

### Add Comment

Add an internal comment to a conversation or reply to an existing comment. Comments are visible only to teammates, not external contacts. Supports @mentions by including teammate handles in the body.

### Create Analytics Export

Create a new analytics data export for a specified time range. Exports can be used to extract analytics data for BI tools or data warehouses. The export is processed asynchronously — use the returned export ID to check status.

### Get Conversation

Retrieve detailed information about a specific conversation, including its messages, tags, assignee, and status. Optionally includes the conversation's messages.

### List Knowledge Bases

List all knowledge bases in Front. Knowledge bases contain organized articles and categories for self-service support.

### List Conversations

List and search conversations in Front. Retrieve conversations with optional filtering by search query, and paginate through results. Use this to find conversations matching specific criteria or to browse recent conversations.

### List Events

List recent events across the company or for a specific conversation. Events track actions like assignments, messages, tags, comments, and status changes. Useful for auditing activity or building activity feeds.

### List Accounts

List company/organization accounts in Front with optional pagination and sorting.

### List Contacts

List and search contacts in Front. Supports filtering by search query and pagination.

### List Inboxes

List all inboxes (shared and private) available in Front. Optionally includes channels and conversations for each inbox.

### List Links

List links that connect Front conversations to items in external systems (e.g., tickets, orders, feature requests).

### List Message Templates

List reusable message templates available in Front. Templates can be used as starting points for common replies.

### List Tags

List all tags in Front at the company level. Tags are used to classify and organize conversations.

### List Teammates

List all teammates (users) in the Front company. Returns each teammate's profile including email, name, availability status, and admin role.

### List Teams

List all teams (workspaces) in Front with their members and inbox assignments.

### Send Message

Send a new outbound message or reply to an existing conversation. When providing a channelId, creates a new conversation. When providing a conversationId, sends a reply in that conversation. Requires the **Send** permission.

### Reply to Conversation

Send a reply to an existing Front conversation. The reply will be sent to the conversation's recipients. Requires the **Send** permission.

### Update Conversation

Update a conversation's properties including status, assignee, tags, followers, and inbox. Supports assigning/unassigning teammates, archiving, reopening, trashing, restoring, adding/removing tags, and managing followers — all in a single flexible operation.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
