# <img src="https://provider-logos.metorial-cdn.com/helpscout.png" height="20"> Helpscout

Manage customer support conversations, customers, and knowledge base content. Create, update, assign, and close conversations across shared mailboxes. Add replies, notes, phone and chat logs, and file attachments to conversations, and download files attached to conversation threads. Create and manage customer profiles with contact details. Organize customers into companies/organizations. Browse tags, teams, and users, and run or toggle workflows. Create and update knowledge base articles, collections, and categories via the Docs API. Access support reporting including conversation volume, response times, user productivity, and customer satisfaction ratings.

## Tools

### Add Thread

Add a reply, note, phone, or chat thread to an existing conversation. Agent replies send actual emails to the customer. Notes are internal-only. Phone and chat threads log non-email customer interactions. Files can be attached as base64-encoded content.

### Create Conversation

Create a new support conversation in a mailbox. You must specify the customer (by email or ID), the mailbox, and at least one thread (the initial message). Optionally assign it to a user, add tags, or set status.

### Create Customer

Create a new customer profile with contact information. At minimum provide a first name or email address.

### Delete Conversation

Permanently delete a conversation. This action cannot be undone.

### Delete Customer

Permanently delete a customer and their associated survey responses and conversations. This supports Help Scout's GDPR erasure workflow and cannot be undone.

### Download Conversation Attachment

Download a file attached to a conversation thread (customer message, reply, note, phone, or chat) as a downloadable file. Call get_conversation first to find the attachment ID in the thread's attachments.

### Get Conversation

Retrieve a single conversation with its full details and threads. Returns the conversation metadata, custom field values, and all threads (customer messages, replies, notes, etc.) including attachment metadata.

### Get Customer

Retrieve a customer's full profile including all emails, phone numbers, and other contact information.

### Get Report

Retrieve reporting data from Help Scout. Choose from company overview, conversation volume, customer satisfaction (happiness), or productivity (response and resolution times) reports. All reports require a date range; add a previous range to get period-over-period deltas.

### List Conversations

Search and list support conversations across mailboxes. Filter by mailbox, folder, status, tag, assignee, modification time, or conversation number, and optionally add an advanced search query. All filters are combined with AND. Results are paginated (25 per page). Only active conversations are returned unless a status is given.

### List Customers

Search and list customer profiles. Filter by email, name, mailbox, or modification time, and optionally add an advanced search query. All filters are combined with AND. Results are paginated (50 per page).

### List Mailboxes

List all mailboxes (shared inboxes) in the Help Scout account. Optionally retrieve folders and custom fields (with dropdown option IDs) for a specific mailbox.

### List Satisfaction Ratings

Retrieve customer satisfaction ratings (Great, Okay, Not Good) with customer comments for a date range. Filter by mailbox and rating. Defaults to the last 30 days.

### List Teams

List all teams in the Help Scout account. Optionally retrieve the members of a specific team. Team IDs can be used as conversation assignees.

### List Users

List users (agents/staff) in the Help Scout account, optionally filtered by email or mailbox. Can also retrieve a specific user by ID or the authenticated user's profile (me).

### Manage Knowledge Base

Manage Help Scout Docs knowledge base content. List sites, collections, categories, and articles. Create, update, or delete articles and collections. Search articles. **Requires a Docs API key** configured in authentication.

### Manage Organization

List, get, create, update, or delete organizations. Organizations represent companies that can be associated with multiple customers.

### Manage Tags

List or get the tags used to categorize conversations across all mailboxes. To create or apply a tag, set it on a conversation with update_conversation; Help Scout creates missing tags automatically. Help Scout does not support renaming or deleting tags through its API.

### Manage Workflow

List, activate, deactivate, or manually run workflows (automation rules). Workflows automate common actions on conversations.

### Update Conversation

Update an existing conversation's properties. Change status, assignee, subject, primary customer, mailbox, tags, or custom fields. Multiple updates can be applied at once.

### Update Customer

Update an existing customer's profile. Change their name, organization, job title, location, or background notes, and add or remove email addresses and phone numbers. Fields that are not provided are left unchanged.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
