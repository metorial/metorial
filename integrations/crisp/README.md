# <img src="https://provider-logos.metorial-cdn.com/crisp.png" height="20"> Crisp

Manage customer conversations, contacts, and support operations across multiple channels. Send and receive messages (text, files, audio, carousels) in conversations, assign conversations to operators, and track conversation states. Create, update, search, and manage contact profiles with custom data, events, and subscription status. Build and manage helpdesk knowledge base articles with multi-language support. Create and manage marketing campaigns including one-shot and automated campaigns. Configure website workspace settings, chatbox appearance, and operator roles. Track visitors in real-time, monitor website availability status, and access analytics for messaging, contacts, ratings, and campaigns. Receive real-time events via webhooks or WebSocket for session changes, messages, campaigns, and more.

## Tools

### Batch Conversation Actions

Perform bulk actions on multiple conversations at once. Resolve, mark as read, or remove multiple conversations in a single operation.

### Create Conversation

Create a new conversation in your Crisp workspace. Returns the new session ID. You can optionally set initial metadata such as nickname, email, subject, and segments after creation using the Update Conversation tool.

### Create Person

Create a new contact profile in the Crisp CRM. At minimum, provide an email or nickname. Returns the new people ID.

### Get Conversation

Retrieve full details of a specific conversation by its session ID, including metadata, state, routing, messages preview, and visitor information.

### Get Messages

Retrieve messages from a conversation. Returns the most recent messages by default. Use timestampBefore for pagination to load older messages.

### Get Person

Retrieve a full contact profile from the Crisp CRM by people ID. Returns profile details, custom data, segments, and subscription status.

### Get Website Availability

Check the current online/offline availability status of the Crisp website (workspace). Returns whether the support team is currently available.

### List Conversations

List and search conversations in your Crisp workspace. Supports filtering by status (unread, resolved, assigned), date range, inbox, and text/segment search. Returns paginated conversation summaries with metadata.

### List Helpdesk Articles

List helpdesk knowledge base articles for a specific locale. Returns paginated article summaries. Use this to browse your knowledge base or find articles to update.

### List Operators

List all operators (team members) of the Crisp workspace. Returns operator details including user ID, email, role, and availability. Useful for finding operator IDs to assign conversations.

### List People

List and search contact profiles in the Crisp CRM. Supports searching by name, email, or segment. Returns paginated contact profiles.

### Manage Helpdesk Article

Create, update, or delete a helpdesk knowledge base article. Articles are organized by locale for multi-language support. You can set the title, content, category, featured status, and order.

### Manage Website Settings

Get or update the Crisp website (workspace) settings. When no settings are provided, returns the current configuration. When settings are provided, updates them. Settings include chatbox appearance, contact info, email preferences, and more.

### Remove Conversation

Permanently remove a conversation from your Crisp workspace. This action is irreversible.

### Remove Person

Permanently remove a contact profile from the Crisp CRM. This action is irreversible.

### Send Message

Send a message in a Crisp conversation. Supports text messages, notes (internal), file attachments, and other message types. Messages can be sent as an operator or as a user.

### Update Conversation

Update a conversation's metadata, state, routing assignment, or block status. Combine multiple updates in a single call — set the nickname, assign an operator, change state to resolved, and add segments all at once.

### Update Person

Update an existing contact profile in the Crisp CRM. Change email, nickname, phone, segments, custom data, and subscription status in a single call.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
