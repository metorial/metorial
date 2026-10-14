# Habitica integration specification

## Authentication

API Credentials accepts the User ID and API Token from Settings > Site Data or Settings > API. Requests use `x-api-user`, `x-api-key`, and `x-client` against `https://habitica.com/api/v3`. The required `xClient` application identifier belongs to authentication and is persisted with the credentials. It must be supplied explicitly as `CreatorUserID-AppName`, using the tool creator's Habitica User ID; it is never derived from the connected account. Existing saved connections retain their former configuration value for tool calls until reconnection; a missing identifier raises an actionable connection error. Stored auth output keeps this field optional for compatibility. API tokens do not use OAuth or token refresh.

## Registered capabilities

- `create_task`, `list_tasks`, `get_task`, `update_task`, `delete_task`, `score_task`: manage personal Habits, Dailies, To-Dos, and Rewards. Retrieval returns stable task/checklist IDs and completion state; task updates support tags, daily repeat days, aliases, attributes, and checklist visibility.
- `manage_checklist`: add, update, toggle completion, or delete one checklist item on a Daily or To-Do. Returns the updated task. Add/update can set explicit completion state.
- `get_user_profile`: read authenticated identity, character stats, party membership, and gem balance.
- `manage_tags`: list, create, update, and delete task tags.
- `cast_skill`, `manage_inventory`, `manage_quest`: invoke documented gameplay operations, subject to class, mana, inventory, group leadership, and other provider requirements.
- `manage_group`, `send_message`, `manage_challenge`: manage available groups, send group/private messages, and manage challenge participation. User challenge listing takes zero-based `page` and optional `memberOnly`, returning up to ten results per page.
- `get_content`: read game-content summaries and spell identifiers.

## Provider limits

Public guild and Tavern features have been retired. Some surviving guild/group operations need special access or an active group plan; retained group input values remain available to connections with access. Habitica enforces these restrictions. The default task list excludes completed To-Dos. No webhook registration tools are exposed by this integration.

All third-party requests must include a valid application identifier. Background automation must follow Habitica's API usage guidelines, including the documented 30-second delay between calls and rate-limit headers. Tools do not automatically retry mutations.

## API references

- [API v3 documentation](https://apidoc.habitica.com/)
- [API usage guidelines](https://github.com/HabitRPG/habitica/wiki/API-Usage-Guidelines)
- [Task controller and API annotations](https://github.com/HabitRPG/habitica/blob/develop/website/server/controllers/api-v3/tasks.js)
- [Challenge controller and API annotations](https://github.com/HabitRPG/habitica/blob/develop/website/server/controllers/api-v3/challenges.js)
