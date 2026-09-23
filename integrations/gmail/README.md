# <img src="https://provider-logos.metorial-cdn.com/gmail.svg" height="20"> Gmail

Send, read, and search email messages with support for recipients, attachments, and HTML content. Create, update, and send drafts. Manage conversation threads and organize messages with labels. Search mailboxes using Gmail query syntax (from, to, subject, date, attachment filters). Manage filters and vacation responders, update the primary address's display name and signature, and view send-as aliases, forwarding addresses, and auto-forwarding status. Optionally look up Google Contacts through the People API when the profile grants Contacts read-only access. The OAuth surface also exposes the Google Other Contacts read-only scope for consent-screen coverage. Import and insert messages for migration. Detect recently dated messages by polling the mailbox.

## Events

### New Message

Enable the **New Message** event to check the connected mailbox every 15 minutes. It searches for messages dated within the past hour, including messages in Spam and Trash. Each event has type `message.added` and uses Gmail's immutable message ID for event identity and deduplication. The output includes `messageId`, `threadId`, `labelIds`, `internalDate` (epoch milliseconds), and available sender, recipient, subject, snippet, and Date header fields.

For example, an event can contain `messageId: "18abc123"`, `threadId: "18abc100"`, `internalDate: "1727000000000"`, and `subject: "Invoice"`. Messages deleted before the next check, added during a polling delay longer than an hour, or imported with a historical internal date can be missed. Deletions and label changes are not emitted. See [Gmail message search](https://developers.google.com/workspace/gmail/api/guides/filtering) and the [Message resource](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages).

## Tools

### Get Attachment

Download an email attachment by its ID. Returns the base64-encoded file data and size. Use the attachment IDs from the message's attachments list.

### Get Message

Retrieve a single email message by its ID. Returns the full message including parsed headers, body (text and HTML), and attachment metadata.

### Get Google Contact

Retrieve detailed Google Contacts information for a People API resource name. Requires the optional Google Contacts read-only OAuth scope.

### List Google Contacts

List the authenticated user's Google Contacts with pagination support. Requires the optional Google Contacts read-only OAuth scope.

### Import Message

Import an email into the mailbox as if it arrived by normal delivery, with Gmail's standard spam, category, and filter processing. Accepts a complete RFC 822 message (plain text or base64) or structured from, to, subject, and body fields, plus optional reply headers and a thread ID to join an existing conversation. Does not send the message.

### Insert Message

Insert an email directly into the mailbox, like IMAP APPEND, without Gmail's scanning or classification; the message gets only the labels you choose. Accepts the same raw or structured message content as Import Message. Does not send the message.

### Manage Draft

Create, update, send, list, get, or delete email drafts. Drafts can be composed with recipients, subject, body, and then sent when ready.

### Manage Labels

List, create, update, get, or delete Gmail labels. Labels organize messages and threads (e.g., INBOX, SENT, STARRED, or custom labels).

### Manage Settings

View and manage Gmail settings including vacation responder (auto-reply), IMAP, POP, display language, mail filters, forwarding addresses, auto-forwarding status, and send-as aliases with signatures. Only the primary address's display name, reply-to address, and signature can be updated.

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
