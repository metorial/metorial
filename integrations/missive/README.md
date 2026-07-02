# <img src="https://provider-logos.metorial-cdn.com/missive-logo.png" height="20"> Missive

Manage collaborative team conversations across email, SMS, WhatsApp, Facebook Messenger, Instagram, live chat, and custom channels in a shared inbox. Browse, filter, and retrieve conversations by mailbox, team, label, or contact. Send messages and drafts with attachments across all supported channels, including scheduled sends and WhatsApp templates. Inject rich posts with Markdown and structured attachments into conversations to surface external system data. Manage conversation state by closing, reopening, assigning, labeling, and merging conversations. Create, update, search, and sync contacts with rich profile data including custom fields and organization memberships. Manage shared labels with hierarchy, color coding, and visibility controls. Create and manage tasks with states, due dates, assignees, and subtasks. Manage teams, canned response templates, and contact books. Generate asynchronous analytics reports filtered by team, users, labels, and account types. Receive real-time webhook notifications for incoming emails, SMS, WhatsApp, Messenger, and chat messages, as well as new comments.

## Tools

### Create Analytics Report

Generate an analytics report for a specified time period. Report generation is asynchronous — the report is created first, then fetched after a short delay. The tool handles the polling automatically and returns the completed report. Supports filtering by team, users, labels, accounts, and account types. Requires a Productive or Business plan; filtering capabilities require Business plan.

### Create Custom Channel Message

Ingest an incoming message from an external system through a custom channel. Use this to integrate message providers not natively built into Missive by creating incoming messages programmatically. Also supports conversation actions (close, label, assign) as part of message creation.

### Create Post

Inject rich content into a conversation from external systems (e.g., GitHub commits, Stripe transactions). Posts support Markdown, structured attachments with fields, colors, and images. Posts are the recommended way to manage conversation state from integrations because they leave a visible trace of the action. Also supports conversation actions like closing, labeling, and assigning.

### Get Conversation

Retrieve a single conversation by its ID, including messages, comments, and posts within it. Returns full conversation details plus optionally the latest messages, comments, or posts.

### List Contact Books

List contact books the authenticated user has access to. Contact book IDs are needed for listing and creating contacts.

### List Contacts

List and search contacts in a contact book. Supports searching by name/email, incremental sync using modifiedSince, and pagination.

### List Conversations

Browse conversations across different mailboxes (Inbox, Closed, Snoozed, Starred, Trash, Spam, Drafts). Filter by team, shared label, organization, contact email, domain, or contact organization. Use cursor-based pagination with the \

### List Organizations and Users

Retrieve organizations the authenticated user belongs to, and/or users within those organizations. Useful for discovering resource IDs for use in other actions.

### List Tasks

List tasks filtered by organization, team, assignee, state, type, or due date range.

### Manage Contacts

Create or update contacts in a contact book. Contacts support rich data including emails, phone numbers, social accounts, physical addresses, and custom fields. When updating, provide the contactId. When creating, provide the contactBookId.

### Manage Conversation

Update a conversation's state: close, reopen, move to inbox, assign to users/team, add or remove labels, or merge with another conversation. Uses posts under the hood, which leave a visible trace in the conversation history.

### Manage Responses

List, create, update, or delete canned response templates. Responses can be scoped to an organization or a personal user, shared with specific teams, and associated with shared labels.

### Manage Shared Labels

Create, update, or list shared labels used to organize conversations. Labels support hierarchical nesting, color coding, and visibility controls.

### Manage Tasks

Create or update tasks. Tasks can be standalone or subtasks within conversations. They support states (todo, in_progress, closed), due dates, assignees, and team associations.

### Manage Teams

List, create, or update teams within organizations. Configure team membership, observers, and mention notification behavior.

### Send Message

Send a message or create a draft across email, SMS, WhatsApp, Messenger, Instagram, Live Chat, or custom channels. Can send immediately, schedule for later, or save as a draft. Also supports conversation actions like closing, labeling, and assigning.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
