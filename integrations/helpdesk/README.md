# <img src="logo.jpeg" height="20"> Helpdesk

Manage HelpDesk support tickets, assign teams and agents, update ticket status and priority, manage tags and followers, merge and unmerge tickets, send public replies and private notes, request customer ratings, manage automation rules and reusable responses, query reports and audit logs, and discover the connected license and saved ticket views.

## Ticket API notes

Ticket creation requires the `message` field for the first plain-text message. Priority labels remain `low`, `medium`, `high`, and `urgent`; requests translate them to the numeric values used by HelpDesk. Tags use tag IDs and custom field maps use their API keys. `list_tickets` returns an opaque pagination cursor; keep the same filters and sort order when using it.

See the [official HelpDesk API reference](https://api.helpdesk.com/docs).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
