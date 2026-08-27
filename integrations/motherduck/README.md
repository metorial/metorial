# <img src="https://motherduck.com/docs/img/favicon.ico" height="20"> MotherDuck

Query MotherDuck databases and manage Dives, Flights, and Guides through MotherDuck's native PostgreSQL wire endpoint and documented SQL functions.

The integration publishes 36 tools. Thirty-five follow the keys and argument shapes of the corresponding official MCP tools, and `get_current_user` is a native read-only identity tool backed by `MD_USER_INFO()`. Production invocations use an access token, a MotherDuck region, and native SQL; they never proxy calls to the official MCP server. Lookout checks the full upstream MCP surface independently for drift while treating the identity tool as a local capability.

Four MCP-only orchestration helpers are intentionally not published because MotherDuck does not document a native API for their behavior:

- `ask_docs_question`
- `get_dive_guide`
- `get_flight_guide`
- `share_dive_data`

Native Dive create/update operations store code but cannot reproduce the MCP server's code-validation and automatic data-flow analysis. The mutation response calls out that limitation.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
