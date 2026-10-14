# <img src="logo.jpg" height="20"> Dailybot

Manage async check-ins, forms, peer recognition, users, teams, and messages with a DailyBot API key. Confirm the credential owner and organization, discover resources with pagination, read form definitions and responses, send check-in reminders, and manage team membership. Messages support images, interactive or link buttons, channel thread replies, and edits using a custom message ID.

Use `get_current_user` to confirm identity, `list_forms` and `get_form` to inspect questions and workflows, and `get_form_responses` to retrieve answers. Form responses default to your own submissions; viewing all responses requires the form's reporting permission. List tools return pagination metadata when the provider supplies it. Existing check-in authoring and email tools retain their legacy API payloads; their current provider support has not been verified.

API keys require a paid DailyBot plan and inherit their owner's permissions. See the [API reference](https://www.dailybot.com/developers/api/) and [integration specification](docs/SPEC.md) for coverage and limitations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
