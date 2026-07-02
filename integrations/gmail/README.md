# <img src="https://provider-logos.metorial-cdn.com/gmail.svg" height="20"> Gmail

Send, read, and search email messages with support for recipients, attachments, and HTML content. Create, update, and send drafts. Manage conversation threads and organize messages with labels. Search mailboxes using Gmail query syntax (from, to, subject, date, attachment filters). Configure mail settings including forwarding rules, filters, vacation responders, signatures, aliases, and delegates. Optionally look up Google Contacts through the People API when the profile grants Contacts read-only access. The OAuth surface also exposes the Google Other Contacts read-only scope for consent-screen coverage. Import and insert messages for migration. Sync mailbox changes incrementally via history API. Subscribe to mailbox change notifications via push notifications.

## Tools

### Get Attachment

Download an email attachment by its ID. Returns the base64-encoded file data and size. Use the attachment IDs from the message's attachments list.

### Get Message

Retrieve a single email message by its ID. Returns the full message including parsed headers, body (text and HTML), and attachment metadata.

### Get Google Contact

Retrieve detailed Google Contacts information for a People API resource name. Requires the optional Google Contacts read-only OAuth scope.

### List Google Contacts

List the authenticated user's Google Contacts with pagination support. Requires the optional Google Contacts read-only OAuth scope.

### Manage Draft

Create, update, send, list, get, or delete email drafts. Drafts can be composed with recipients, subject, body, and then sent when ready.

### Manage Labels

List, create, update, get, or delete Gmail labels. Labels organize messages and threads (e.g., INBOX, SENT, STARRED, or custom labels).

### Manage Settings

View and manage Gmail settings including vacation responder (auto-reply), mail filters, forwarding addresses, and send-as aliases with signatures.

### Manage Thread

Get, list, modify labels, trash, untrash, or delete email conversation threads. Retrieve full thread conversations with all messages.

### Modify Message

Modify a message's labels, move it to trash, restore it from trash, or permanently delete it. Supports both single and batch operations on multiple messages.

### Search Messages

Search and list email messages using Gmail query syntax. Returns parsed messages with headers, body, and attachment metadata. Use the same search operators available in the Gmail search bar: \

### Search Google Contacts

Search the authenticated user's Google Contacts by name, email address, phone number, or other contact fields. Requires the optional Google Contacts read-only OAuth scope.

### Send Email

Send an email message to one or more recipients. Supports plain text and HTML bodies, CC/BCC recipients, file attachments (base64-encoded), and replying within existing threads.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
