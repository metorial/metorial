# GoDial

Manage calling lists, contacts, teams, and members in GoDial Enterprise. Discover list and team IDs, add contacts and members, and remove member accounts.

Obtain an API access token from **Dashboard → Integration → External API** using a manager account. The integration sends this token as the `access_token` query parameter.

Use `list_lists` before `list_contacts` or `add_contact`, `list_teams` before `add_member`, and `list_accounts` before `remove_account` to discover the required IDs.

See the [GoDial API guide](https://godial.cc/blog/integrating-your-website-or-crm-with-godial-using-api/) and [developer documentation](https://godial.stoplight.io/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
