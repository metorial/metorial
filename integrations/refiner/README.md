# <img src="logo.png" height="20"> Refiner

Manage customer feedback surveys for web and mobile applications. Create and retrieve survey responses (NPS, CSAT, CES, etc.), manage contacts and their traits, track user events, organize contacts into segments, and tag survey responses. Identify and update users with custom attributes, group users into accounts, and import user data from backend databases.

Confirm the connected environment with `get_current_project`. Retrieve survey configuration with `list_surveys` and review earlier survey versions with `list_survey_history`. The `delete` action on `manage_survey` archives a survey; archived surveys remain available through `list_surveys`. Response imports can identify an existing contact by user ID, email, or contact UUID.

Create an API key under **Environment Settings > API Keys** in Refiner. See the [official API reference](https://refiner.io/docs/api/) for endpoint details.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
