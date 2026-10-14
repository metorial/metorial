# Connecteam Integration Specification

## Authentication

API keys use the `X-API-KEY` header. OAuth 2.0 client credentials use HTTP Basic authentication at `/oauth/v1/token` and a bearer access token on subsequent requests. Optional requested scopes are sent as the `scope` form field. Tokens expire after 24 hours; renewal requests a new token with the stored client credentials.

The API host belongs to authentication settings: `https://api.connecteam.com` for global accounts, or `https://api-au.connecteam.com` for accounts signing in at `app-au.connecteam.com`. The selected host and authentication type are persisted with the credential. Existing connections without this state use the previously stored configuration host, and preserve their prior authentication headers until reauthentication.

## Tools

- `get_account`: company ID and name from `/me`.
- `list_users`, `create_users`, `update_users`: employee discovery, batch creation/update, archiving, and admin invitations. New employees use `userType: user`; invitations require the employee ID, email, and title. The public `emailAddress` update field maps to the provider's `email` field.
- `get_custom_fields`: user custom fields, categories, and Smart Groups.
- `manage_time_clock`: time clock discovery, date-scoped activities and totals, clock in/out. Activity and timesheet endpoints require start and end dates and do not support pagination.
- `manage_time_off`: policy types, balances, request creation/update, and balance adjustment.
- `list_time_off_requests`: requests overlapping an inclusive date range, filtered by users and statuses, with pagination. Requests default to approved; the maximum range is 365 days.
- `manage_scheduler`: scheduler discovery, V1 shifts, shift custom fields/layers, and unavailability.
- `manage_jobs`: jobs and sub-jobs, including custom field discovery.
- `manage_forms`: form and submission discovery/read.
- `manage_tasks`: Quick Tasks, task boards, labels, and sub-tasks. Public string descriptions map to the provider's description object; labels map to label IDs. Both create and update require title, userIds, and status.
- `list_conversations`: team chats/channels and optional custom publisher discovery, with pagination offsets.
- `send_chat_message`: conversation or private messages sent by a custom publisher. Public `message` maps to provider `text`; attachment types default to file and may explicitly be image.
- `manage_onboarding`: pack discovery, assignments, and user assignment.

## Access and limits

API access requires an eligible Expert or higher plan, and feature availability depends on purchased hubs. Connecteam enforces account permissions, feature flags, field constraints, and resource ownership. Scheduler V1 remains supported; JS Vision/V2-specific functionality is outside this integration's current tool surface.

## Official references

- [OpenAPI specification](https://app.connecteam.com/openapi.json)
- [Authentication](https://developer.connecteam.com/docs/authentication-1)
- [OAuth 2.0](https://developer.connecteam.com/docs/oauth-20)
- [Australian accounts](https://developer.connecteam.com/docs/australian-clients)
- [API access](https://developer.connecteam.com/docs/api-access)
- [Managing Tasks](https://developer.connecteam.com/docs/tasks-managing-tasks)
- [Private Messages](https://developer.connecteam.com/docs/chat-private-messages)
- [Get Time Off Requests](https://developer.connecteam.com/docs/time-off-get-time-off-requests)
