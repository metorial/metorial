# <img src="https://provider-logos.metorial-cdn.com/hiver.png" height="20"> Hiver

Manage shared email inboxes and customer support conversations within Gmail and Outlook. List and browse shared inboxes, retrieve and update conversations (status, assignee, tags), search users and tags per inbox, and create categorization tags.

## Tools

### Create Inbox Tag

Create a tag in a shared inbox with an optional color and description, then apply it to conversations.

### Get Conversation

Retrieve detailed information about a specific conversation in a shared inbox. Returns available conversation details including status, assignee, tag identifiers, and conversation links. Accepts Hiver conversation IDs or Gmail thread IDs; supply the inbox member’s email for a thread ID from their own mailbox.

### Get Inbox

Retrieve detailed information about a specific shared inbox by its ID, including its users and tags. Provides a complete view of the inbox's team members and available categorization tags.

### List Conversations

Retrieve conversations from a shared inbox with pagination support. Returns a list of conversations along with a pagination token for fetching subsequent pages. Use sorting options to control the order of results.

### List Inboxes

List all shared inboxes configured in your Hiver account. Returns inbox details including names and email addresses. Useful for discovering available shared mailboxes before performing operations on conversations within them.

### Search Inbox Tags

Search for tags within a specific shared inbox. Can list all tags or search by name query. Useful for discovering available tags for categorizing conversations.

### Search Inbox Users

Search for users within a specific shared inbox. Can list all users or search by name/email query. Useful for finding team members to assign conversations to.

### Update Conversation

Update properties of a conversation in a shared inbox. Supports modifying status, assignee, and tags. Assign by discovered user ID or member email. Tags replace the existing set. Provide only the fields you want to change.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
