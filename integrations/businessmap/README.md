# Businessmap

Manage cards, boards, workspaces, comments, subtasks, relationships, blocking,
custom-field values, and logged time through the Businessmap API v2.

Connect with your API key from **My Account > API**, the account subdomain,
and the domain used to sign in (`kanbanize.com` or `businessmap.io`). Existing
connections default to `kanbanize.com`.

Use `get_current_user` to check the connected identity, `list_workspaces` and
`list_boards` to discover containers, and `get_board` to find matching workflow,
column, and lane IDs before creating or moving cards. Use `list_card_types`,
`list_users`, and `list_block_reasons` to discover IDs for card properties.

Card priority values are 1=Critical, 2=High, 3=Average, and 4=Low. Deadlines use
ISO 8601 datetimes with timezone offsets. `log_time` accepts hours or minutes
and converts them to the API's seconds. `list_cards` returns up to 200 cards
per state per page; `includeArchived` combines active and archived pages.

`manage_custom_fields` updates scalar text, number, date, and link fields; use
`null` to clear a value. Relationship `linkType` values remain 0=relative,
1=predecessor, and 2=successor.

[Official API documentation](https://demo.kanbanize.com/openapi)
