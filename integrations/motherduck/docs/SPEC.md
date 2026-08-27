# MotherDuck integration specification

## Source of truth

Lookout compares this integration with MotherDuck's official remote MCP surface. That remote service is a specification and drift source only; production tools do not call or pipe invocations to it.

- MCP overview: https://motherduck.com/docs/sql-reference/mcp/
- PostgreSQL endpoint: https://motherduck.com/blog/motherduck-now-speaks-postgres/
- MotherDuck SQL reference: https://motherduck.com/docs/sql-reference/motherduck-sql-reference/
- Dives: https://motherduck.com/docs/category/dives/
- Flights: https://motherduck.com/docs/category/flights/
- Guides: https://motherduck.com/docs/category/guides/

## Authentication and transport

Users provide a MotherDuck access token and the region of their account. The integration connects with TLS to the documented regional PostgreSQL endpoint as user `postgres`, using the access token as its password. Account-level calls use MotherDuck's documented `md:` default-database context; tools with a database argument connect to that database directly.

## Tool parity

The 35 official MCP tools with supported native implementations preserve their documented keys and input parameters. They use SQL, MotherDuck metadata functions, or documented `MD_*` table functions. A thirty-sixth local read-only tool, `get_current_user`, exposes stable authenticated user, organization, and region identity through `MD_USER_INFO()` and is designated as an owned capability in Lookout. Client-side behavior is limited to output shaping, keyword filtering, safe read-only SQL validation, targeted text edits, and combining documented native responses.

The following MCP server orchestration capabilities have no documented native equivalent and are omitted instead of publishing tools that cannot succeed or using an invented endpoint:

- documentation question answering (`ask_docs_question`)
- generated Dive instructions (`get_dive_guide`)
- generated Flight instructions (`get_flight_guide`)
- Dive query analysis plus automatic organization sharing (`share_dive_data`)

Native `MD_CREATE_DIVE` and `MD_UPDATE_DIVE_CONTENT` do not perform the remote server's code-validation and database-analysis pass. Successful mutation responses include a warning about that difference.

## Events

MotherDuck's documented MCP and SQL surfaces do not expose webhook or trigger subscriptions, so this integration has no triggers.
