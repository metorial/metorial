# <img src="logo.jpg" height="20"> Chatwork

Send, read, edit, and delete messages in chat rooms. Retrieve individual messages and tasks by ID. Create and manage group rooms with configurable members and roles. Assign and track tasks with due dates and completion status. List files and prepare renewable downloads. Manage contacts and contact requests, and retrieve your profile and unread counts.

Use `list_rooms` to discover room IDs, `get_contacts` to discover account IDs, and `get_room` with `includeMembers: true` to discover room members. Message, task, and file lists return at most 100 items; room task status and assignee filters, and file uploader filters, apply on the provider before that limit. Message history depends on your Chatwork account plan.

Connect with an API token or a confidential OAuth client. OAuth tokens refresh automatically; new connections request only the permissions used by these tools. Specific file details retain the temporary `downloadUrl` and also provide a downloadable file. Chatwork download URLs expire after 30 seconds.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
