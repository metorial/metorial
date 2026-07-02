# Statbank Norway – SSB Integration

## Source

Statbank Norway – SSB PxWebApi v2: `https://data.ssb.no/api/pxwebapi/v2`

## Auth

No authentication is required.

## Tool Surface

### `get_tables`

Searches tables, retrieves table summaries, retrieves compact JSON-stat metadata, and inspects codelists used by valuesets and groupings.

### `query_table`

Retrieves data from a table with GET or POST. POST is the default because it avoids URL-length problems for larger selections. JSON outputs are returned as structured data. File-like formats (`csv`, `xlsx`, `html`, and `px`) are returned as Slate attachments with metadata only in the structured output.

`selection` may be omitted, or passed as an empty array, to use SSB's default table selection. Once a non-empty selection is provided, SSB requires selections for every non-eliminable variable in the table metadata; partial selections are rejected with a user-facing validation error before the data request is sent. Wide selections should be batched because each extract is capped at 800,000 cells.

## Provider Constraints

- Each extract is limited to 800,000 data cells.
- Requests are currently limited to 30 calls per minute per IP address.
- SSB reports maintenance windows around metadata updates and figure publication times.
- The API returns JSON-stat status values for special table cells such as missing, unavailable, and confidential values.
