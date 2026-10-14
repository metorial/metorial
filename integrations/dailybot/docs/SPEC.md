# DailyBot Integration Specification

## Authentication

Connect with an API key from DailyBot Organization Settings → Integrations.
Requests use `X-API-KEY` against `https://api.dailybot.com/v1/`. The API key
inherits its owner's organization and permissions and requires a paid plan.
`get_current_user` confirms the current user or agent identity;
`get_organization` confirms organization scope. Email visibility depends on
permissions and the `includeEmail` option.

## Tools

The integration exposes 23 tools:

- Check-ins: `list_checkins`, `get_checkin`, `create_checkin`, `update_checkin`,
  `delete_checkin`, `get_checkin_responses`, and `send_checkin_reminders`.
- Forms: `list_forms`, `get_form`, and `get_form_responses`.
- Templates: `list_templates` and `get_template`.
- Users: `get_current_user`, `list_users`, `get_user`, and `update_user`.
- Teams: `list_teams`, `get_team_members`, and `manage_team_members`.
- Messaging: `send_message` and `send_email`.
- Recognition and organization: `give_kudos` and `get_organization`.

## Pagination and discovery

User, team, template, and check-in lists accept `page` and `pageSize`. Form
lists and form responses accept `limit` and `offset`. List results include
`count`, `next`, and `previous` when returned by DailyBot. Check-in responses
also accept the documented page parameters; the existing `limit` and `offset`
inputs remain available for compatibility.

Use list tools to find resource UUIDs before invoking detail or mutation tools.
User listings can search by name, email, or external ID and request email
addresses. Check-in lists can search by name or filter by team/user. Templates
can render special variables in the context of a check-in.

## Forms

`get_form` returns questions, workflow configuration, anonymity, and the full
provider object. `get_form_responses` retains original answer values and
response metadata. It returns the caller's own responses by default. `all`
or filtering another submitter requires `VIEW_REPORTS` permission. Responses
can be filtered by date, content search, and workflow state, and ordered by
creation time. The provider rejects a workflow-state filter on a form without
a workflow.

## Messaging

`send_message` requires at least one user, team, or channel. Channels can carry
`thread` and `channelType`. Each button keeps the existing `label`, `value`, and
optional `type` inputs, with optional `url` for link buttons and `callbackUrl`
for interactive buttons. The default type is `interactive`. Reusing
`botMessageId` within 72 hours requests an edit of the original message.

## Compatibility and limits

Existing public tool keys, fields, types, optionality, template enums, and raw
provider output fields remain available. No file-producing tool is exposed.
There are no registered triggers or normalized chat adapters.

Current official documentation uses `/checkins/create/`, `/config/`, and
`/archive/` for check-in authoring, with inline questions, participants, and a
nested schedule. Existing template-based authoring, update, delete, and reminder
tools retain their legacy paths and payloads because a documented equivalence
or removal notice was not found. Current email documentation names `to`,
`subject`, `body_html`, and `body_text` but does not define recipient identifier
semantics; the existing UUID-based email payload is retained. The current team
member reference omits the add-member request body. The supplemental user-update
reference documents first/last names, timezone, and metadata, while the existing
full-name, occupation, schedule, time-off, active-status, and bot-enabled update
fields remain undocumented there. Those legacy write fields require provider
verification before claiming current support.

## Official references

- [Authentication](https://www.dailybot.com/developers/authentication/)
- [Users](https://www.dailybot.com/developers/api/users/)
- [Organization](https://www.dailybot.com/developers/api/organization/)
- [Teams](https://www.dailybot.com/developers/api/teams/)
- [Check-ins](https://www.dailybot.com/developers/api/check-ins/)
- [Forms](https://www.dailybot.com/developers/api/forms/)
- [Templates](https://www.dailybot.com/developers/api/templates/)
- [Messaging](https://www.dailybot.com/developers/api/messaging/)
- [Kudos](https://www.dailybot.com/developers/api/kudos/)
