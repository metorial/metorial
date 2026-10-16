# TRIGGERcmd Specification

## Overview

TRIGGERcmd runs commands configured locally on computers with its agent installed. This integration discovers registered computers and commands, requests command execution, inspects run history, and discovers or triggers panel buttons. The commands themselves remain on each computer; trigger names and metadata are available through the cloud API.

## Authentication

- **API Token** (`api_token`): use the personal Bearer token from the [Instructions page](https://www.triggercmd.com/user/computer/create) or profile page. Requests send `Authorization: Bearer <token>`; run-history and panel routes additionally use the token query parameter shown in the provider's examples.
- **OAuth** (`oauth`): retains the existing authorization-code connection at `https://www.triggercmd.com/oauth/authorize` and form-encoded token exchange at `https://www.triggercmd.com/oauth/token`. The existing `default` scope is retained. Access tokens, returned refresh tokens, and returned expiry values are saved. Refresh uses the saved refresh token and preserves it when the provider omits a replacement. Existing connections without a saved refresh token must reconnect if a refresh is needed.

The provider confirms the OAuth endpoint URLs in its [SmartThings setup instructions](https://www.triggercmd.com/forum/topic/2494/new-smartthings-integration-2023/7). Public documentation does not specify token lifetime, refresh-response fields, or a dedicated current-user REST endpoint. Expiry is therefore derived only when the token response includes `expires_in`; no lifetime or identity endpoint is guessed.

No additional connection configuration is required.

## Tools

| Key | Behavior |
| --- | --- |
| `list_computers` | Retrieve registered computer IDs and names with `GET /api/computer/list`. |
| `list_commands` | Retrieve commands with `POST /api/command/list`; optionally filter by `computer_id` using a `computerId` from `list_computers`. Outputs retain command IDs, names, trigger names, parameter support, metadata, and computer references; populated computer names are exposed when returned. |
| `trigger_command` | Submit the computer name, trigger name, and optional `params` string to the existing `POST /api/run/triggerSave` route. The full provider response remains in `result`. An explicitly supplied empty parameter string is preserved. |
| `command_run_history` | Retrieve `GET /api/run/list` with `command_id` and descending `createdAt` order. Use a command ID from `list_commands`. Outputs retain run IDs, statuses, and timestamps. |
| `list_panel_buttons` | Retrieve `GET /api/panelbutton/list` and return button IDs and names, panel IDs and names, and configured parameter choices. |
| `trigger_panel_button` | Request `GET /api/panel/trigger` with the panel and button names discovered above and optional parameters. Return the full provider response in `result`. |

Discovery supports the documented `records` response envelope as well as legacy bare arrays. Record IDs accept `id` and `_id`; optional null metadata is omitted from normalized outputs. API errors and invalid discovery responses fail with a service error instead of being reported as successful empty results.

Trigger requests acknowledge dispatch, not completion. Use command run history to inspect later execution status. Commands must accept parameters for parameters to take effect. Panel actions are configured in TRIGGERcmd before using this integration. Public sources do not define pagination parameters for these routes; tools return the records included by the provider response.

## Boundaries

Computer and command setup remains in the TRIGGERcmd agent and dashboard. Computer sharing and unauthenticated command bookmarks are dashboard features and are not exposed as tools. The reviewed REST documentation provides no suitable current-user endpoint or webhook registration API, so this integration has no identity tool or event triggers. It does not download or export files.

## Official sources

- [List commands](https://github.com/rvmey/triggercmd-docs/blob/master/API/ListCommands.md): current command discovery route and Bearer authentication.
- [Trigger command](https://github.com/rvmey/triggercmd-docs/blob/master/API/TriggerCommand.md): computer, trigger, and parameter semantics for the current `/api/run/trigger` route.
- [Computer and scoped command discovery](https://www.triggercmd.com/forum/topic/370/install-from-github-repo): provider-maintainer examples of computer listing and `computer_id` filtering.
- [Run history](https://www.triggercmd.com/forum/topic/59/api-call-to-list-your-commands-on-each-computer): run route, command filter, descending ordering, and status/timestamp fields.
- [CLI documentation](https://github.com/rvmey/triggercmd-docs/blob/master/tcmdCLI.md) and [provider CLI source](https://github.com/rvmey/triggercmdGOclient/blob/master/tcmd.go): `records`, populated computers/panels, panel discovery/trigger routes, optional parameters, and continued support for `/api/run/triggerSave`.
- [Local command definitions](https://github.com/rvmey/triggercmd-docs/blob/master/Commands.md): trigger names, parameter support, and local command storage.
