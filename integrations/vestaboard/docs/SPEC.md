# Vestaboard specification

Send and read messages on Vestaboard displays through the Cloud API, existing Subscription API connections, or the Local API. Flagship displays have 6 rows and 22 columns; Vestaboard Note has 3 rows and 15 columns. Cloud API Note Array tokens target the combined layout automatically. Local Note Arrays require separate requests to the individual boards.

## Authentication and setup

- Cloud API: create a board-scoped token in the mobile app or web app and grant the read/write permissions needed by your tools. Requests use `X-Vestaboard-Token` at `https://cloud.vestaboard.com`.
- Subscription API: existing API key and secret pairs use `x-vestaboard-api-key` and `x-vestaboard-api-secret` at `https://subscriptions.vestaboard.com`. The provider recommends migration to the Cloud API. Discover target IDs with `list_subscriptions`; no board ID is required at connection setup.
- Local API: enable the Local API using the provider's emailed enablement token, then connect with the resulting permanent API key and the board's HTTP or HTTPS base URL, usually `http://vestaboard.local:7000`. Requests use `X-Vestaboard-Local-Api-Key`. The execution environment must be able to reach the board's network.

The global configuration is empty. Credentials and the Local API base URL belong to authentication. The documented APIs do not expose a current-user/profile endpoint or OAuth refresh flow.

## Tools

| Key | Behavior |
| --- | --- |
| `send_message` | Send exactly one of text or a rectangular character array. Cloud supports `forced` to override quiet hours. Subscription requires an ID discovered by `list_subscriptions`. Local text is converted by the public formatting service; optional `rows` and `columns` select the target size, defaulting to 6 by 22. Local `localTransition` configures the documented animation strategy, interval, and step size for that message. Returns status, message ID and numeric creation timestamp when supplied, optional muted state, and the complete provider response. |
| `read_message` | Read through Cloud or Local API. Cloud JSON-encoded layouts are decoded into numeric arrays. The current Cloud message ID is preserved. |
| `get_transition` | Read persistent Cloud transition style and speed. |
| `set_transition` | Set persistent Cloud transition style (`classic`, `wave`, `drift`, `curtain`) and speed (`gentle`, `fast`). Transitions do not apply to Cloud Note Arrays. |
| `compose_vbml` | Render components, templates, props, raw characters, dimensions, alignment, and absolute positions through the public `https://cloud.vestaboard.com/vbml/compose` endpoint. A component requires a template or raw characters; raw characters take precedence. Referenced props must be supplied. |
| `format_text` | Format text through public `https://cloud.vestaboard.com/vbml/format`. Optional `rows` and `columns` support Note and custom dimensions; defaults are 6 and 22. Returns the character grid directly. |
| `list_subscriptions` | Discover Subscription API subscription IDs and associated board IDs. The documented endpoint has no pagination parameters. |

Cloud does not accept blank messages. Sending more than one message per 15 seconds can result in dropped messages. Local sends accept raw arrays, or the documented object payload when animation options are supplied. Character code 71 is unavailable through Local API; local white/black color appearance depends on the physical board color.

All public formatting requests omit credentials. No file download/export endpoints or webhook lifecycle are documented in this surface.

## Official references

- [Cloud authentication](https://docs.vestaboard.com/docs/read-write-api/authentication/)
- [Cloud endpoints](https://docs.vestaboard.com/docs/read-write-api/endpoints/)
- [Cloud Note Arrays](https://docs.vestaboard.com/docs/read-write-api/note-arrays/)
- [Subscription endpoints](https://docs.vestaboard.com/docs/subscription-api/endpoints/)
- [Local authentication](https://docs.vestaboard.com/docs/local-api/authentication/)
- [Local endpoints](https://docs.vestaboard.com/docs/local-api/endpoints/)
- [Character codes](https://docs.vestaboard.com/docs/charactercodes/)
- [VBML](https://docs.vestaboard.com/docs/vbml/introduction/)
