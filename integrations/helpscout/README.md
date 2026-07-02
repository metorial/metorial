# <img src="https://provider-logos.metorial-cdn.com/helpscout.png" height="20"> Helpscout

Manage customer support conversations, customers, and knowledge base content. Create, update, assign, and close conversations across shared mailboxes. Add replies, notes, and attachments to conversation threads. Create and manage customer profiles with contact details and custom properties. Organize customers into companies/organizations. Manage tags, teams, users, and automated workflows. Create and update knowledge base articles, collections, and categories via the Docs API. Access support reporting including conversation volume, response times, user productivity, and customer satisfaction ratings. Configure webhooks to receive real-time notifications on conversation, customer, and organization changes.

## Tools

### Add Thread

Add a reply, note, or phone thread to an existing conversation. Agent replies send actual emails to the customer. Notes are internal-only. Phone threads log phone calls.

### Create Conversation

Create a new support conversation in a mailbox. You must specify the customer (by email or ID), the mailbox, and at least one thread (the initial message). Optionally assign it to a user, add tags, or set status.

### Delete Conversation

Permanently delete a conversation. This action cannot be undone.

### Get Conversation

Retrieve a single conversation with its full details and threads. Returns the conversation metadata plus all threads (replies, notes, etc.) in the conversation.

### Get Report

Retrieve reporting data from Help Scout. Choose from company overview, conversation metrics, or customer satisfaction (happiness) reports. All reports require a date range.

### List Conversations

Search and list support conversations across mailboxes. Filter by mailbox, status, tag, assignee, or use a custom query string. Results are paginated.

### List Mailboxes

List all mailboxes (shared inboxes) in the Help Scout account. Optionally retrieve folders and custom fields for a specific mailbox.

### List Satisfaction Ratings

Retrieve customer satisfaction ratings. Filter by mailbox and date range.

### List Teams

List all teams in the Help Scout account. Optionally retrieve the members of a specific team.

### List Users

List all users (agents/staff) in the Help Scout account. Optionally retrieve details for a specific user by ID or get the authenticated user's profile.

### List Customers

Search and list customer profiles. Filter by email, name, mailbox, or use a custom query. Results are paginated.

### Manage Knowledge Base

Manage Help Scout Docs knowledge base content. List sites, collections, categories, and articles. Create, update, or delete articles and collections. Search articles. **Requires a Docs API key** configured in authentication.

### Manage Organization

List, get, create, update, or delete organizations. Organizations represent companies that can be associated with multiple customers.

### Manage Tags

List, create, update, or delete tags. Tags are used to categorize and organize conversations. Use "list" to see all tags, or create/update/delete individual tags.

### Manage Workflow

List, activate, deactivate, or manually run workflows (automation rules). Workflows automate common actions on conversations.

### Update Conversation

Update an existing conversation's properties. Change status, assignee, subject, tags, or custom fields. Multiple updates can be applied at once.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
