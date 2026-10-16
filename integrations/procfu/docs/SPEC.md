# ProcFu Integration

Use ProcFu’s Functions API to automate Podio, run saved scripts, query connected MySQL databases, and call configured OAuth services.

## Authentication

Connect using the API Auth Token from ProcFu’s [Security & Keys](https://help.procfu.com/security--keys.html) page. ProcFu requires the calling server’s IP address to be allowed there. Requests use HTTPS POST to `https://procfu.com/exe/{function}.pf`, an `Authorization: Basic {token}` header, and URL-encoded form parameters.

The connection profile and `who_am_i` use the documented [Who Am I](https://procfu.com/scripts/?s=whoami.pf) function. ProcFu manages the underlying Podio and third-party OAuth connections; this integration authenticates to ProcFu using the API token.

## Supported Operations

- **Account:** Get the connected email, account usage and limits, and recent error text. Restrict error lookup by function filename and time window.
- **Discovery:** List Podio organizations and workspace summaries, then use `get_podio_app_info` with `list_apps` to find apps. Get app definitions, category choices, and recent activity with an optional stopping date.
- **Items:** Create, retrieve, update, delete, search, and filter Podio items. Preserve complete provider responses for raw item retrieval and filtering. Field-based search supports equals and contains and accepts a whole-number result limit from 1 through 20.
- **Comments:** Create, retrieve, or delete comments. Creation and deletion support hook and notification flags.
- **Variables:** Get, set, list, or increment global variables. `incrementBy` defaults to 1 and supports other numeric amounts.
- **ProcScript:** Run a saved script with an optional JSON object payload, synchronously or in the background. The output contains the provider’s result or acknowledgment.
- **Workflows:** Trigger a manual PWA/GlobiFlow flow using its flow ID, item ID, and webhook c/p values. ProcFu confirms successful trigger requests with status 200.
- **MySQL:** Return a single query result, return multiple rows, or execute a command. Use `?` placeholders and an ordered parameter array. A connection name selects among configured databases.
- **OAuth services:** Send requests through a previously configured ProcFu OAuth service using its service name and internal user reference. Responses remain complete, including a provider-returned `false` value.
- **Podio API:** Send raw Podio API requests with a relative endpoint path, HTTP method, options object, and attributes object.

## Provider Documentation

- [Functions API and external access](https://help.procfu.com/functions-api.html)
- [Function catalog](https://procfu.com/scripts/)
- [Organizations and workspace discovery](https://procfu.com/scripts/?s=podio_orgs_get_raw.pf)
- [Account usage](https://procfu.com/scripts/?s=account_get_usage.pf) and [recent errors](https://procfu.com/scripts/?s=account_last_error.pf)
- [Podio app search](https://procfu.com/scripts/?s=podio_app_search.pf) and [item filtering](https://procfu.com/scripts/?s=podio_item_filter.pf)
- [Comment deletion](https://procfu.com/scripts/?s=podio_comment_delete.pf) and [variable increments](https://procfu.com/scripts/?s=var_inc.pf)
- [ProcScript execution](https://help.procfu.com/running-procscript-from-podio-workflows.html)
- [OAuth service requests](https://procfu.com/scripts/?s=api_request_send.pf)

## Events

This integration exposes tools only. ProcFu’s own workflow configuration remains managed in ProcFu.
