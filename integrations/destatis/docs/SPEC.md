# Destatis GENESIS-Online Integration Specification

## Purpose and source classification

This document is the implementation and maintenance contract for the non-mutating Destatis GENESIS-Online data integration. Statements labeled **Provider fact** come from official Destatis or GENESIS-Online sources. Statements labeled **Integration contract** or **Integration safety choice** describe the behavior implemented in this package and are not provider limits unless explicitly stated. The integration does not mutate database content or account settings; credential validation has the provider-documented operational behavior described below.

Official sources, rechecked on 2 September 2026:

- [Destatis GENESIS-Online API overview](https://www.destatis.de/EN/Service/OpenData/api-webservice.html)
- [GENESIS web services guide](https://genesis.destatis.de/datenbank/online/docs/GENESIS-Webservices_Introduction.pdf)
- [Official POST request examples](https://genesis.destatis.de/datenbank/online/docs/20250505_python_post_logincheck_tablefile_cubefile.pdf)
- [GENESIS-Online service announcements](https://genesis.destatis.de/datenbank/online/announcement)
- [GENESIS-Online account interface and Webservice (API) modal](https://genesis.destatis.de/datenbank/online#modal=web-service-api)
- [Destatis homepage](https://www.destatis.de/EN/Home/_node.html)
- [Official Destatis logo asset](https://www.destatis.de/SiteGlobals/Frontend/Images/logo.svg?__blob=normal&v=11)
- [Destatis legal notice, copyright, and GENESIS data licence](https://www.destatis.de/DE/Service/Impressum/_inhalt.html)

## Provider and authentication model

| Contract | Classification |
| --- | --- |
| API base URL: `https://genesis.destatis.de/genesisWS/rest/2020` | Provider fact |
| Current REST requests use `POST` with `Content-Type: application/x-www-form-urlencoded`. Account data is placed in the `username` and `password` HTTP headers; action parameters are form fields in the body. | Provider fact |
| A personal token is displayed after sign-in in the **Webservice (API)** modal. The token is sent as `username`; `password` is empty. Regenerating a token immediately invalidates the old token. | Provider fact |
| Personal tokens cannot call profile password/removal operations or submit `job=true` requests; those require username/password authentication. | Provider fact |
| When more than three requests run concurrently, `logincheck` automatically terminates requests that have been running for more than 15 minutes. | Provider fact |
| The integration exposes only personal-token authentication and validates it with `POST /helloworld/logincheck`. | Integration contract |
| Credential validation therefore can end an affected long-running provider request. A user can retry or narrow that request after validation completes. | Integration contract and user impact |
| The non-secret `language` configuration is `en` or `de`, defaults to `en`, and applies to messages and descriptions. Some provider metadata can remain untranslated. | Provider fact plus integration default |

The token is never returned in tool output. The client removes provider `Parameter` transport metadata from normalized JSON output, recursively removes nested `Parameter` properties, and redacts the token from user-facing error messages, upstream status text, and upstream codes. These are **integration safety choices**.

## Tool inventory and endpoint map

The actions are registered in this stable order:

| Order | Tool ID | Provider action | Outcome |
| --- | --- | --- | --- |
| 1 | `destatis-search_catalog` | `POST /find/find` | Structured catalogue matches across tables, statistics, cubes, variables, and time series. |
| 2 | `destatis-get_metadata` | `POST /metadata/{table,cube,statistic,timeseries,variable,value}` | Structured object metadata and summarized table or cube dimensions. |
| 3 | `destatis-list_variable_values` | `POST /catalogue/values2variable` | Structured values related to one variable. |
| 4 | `destatis-download_table` | `POST /data/tablefile` with `job=false` | One downloadable table file plus structured file metadata. |
| 5 | `destatis-download_cube` | `POST /data/cubefile` with `format=csv` | One downloadable cube CSV plus structured file metadata. |

Every full tool ID is below the 60-character bridge limit. All five tool operations leave database content and account settings unchanged; credential validation separately calls `logincheck` as documented above.

## Request and response envelopes

**Provider facts:** Most JSON actions return an envelope containing `Ident`, `Status`, `Parameter`, `List` or `Object`, and `Copyright`. `Status` contains `Code`, `Content`, and `Type`; the guide defines `Error`, `Warning`, and `Information` types. The login check instead returns a top-level status string and username.

**Integration contract:**

- Code `0` with a usable payload is success.
- A non-error warning with a usable `List` or `Object` remains usable; warning text and provider copyright are retained.
- Code `104` means no object matches the selection. `search_catalog` and `list_variable_values` explicitly convert it to an empty list with the provider warning. Other actions treat it as an error because they require a concrete object or file.
- Code `98` is the provider's direct-table size failure. A provider POST example dated 24 March 2025 documented that tables above 40,000 values could not be downloaded directly; the current API guide does not publish a fixed threshold. Treat 40,000 as a dated example, not a current guarantee. If the provider rejects a large export, narrow years, time slices, contents, or variable selections.
- Other nonzero error envelopes become user-facing provider errors carrying the normalized upstream code without the request `Parameter` block.
- File actions detect a JSON error envelope even when it arrives in a nominal file response and apply the same status policy.

## Public schemas

### Shared fields

| Field | Schema and mapping | Classification |
| --- | --- | --- |
| `area` | `public`, `user`, or `all`; defaults to `public`. Maps to provider `area`. | Provider values; integration default |
| `contents` | Optional non-empty array of unique content codes, each 1-6 characters. Maps to comma-separated provider `contents`. | Provider bound plus integration structure |
| `startYear`, `endYear` | `YYYY` or `YYYY/YY`; leading year 1900-2100; start must not be later than end. Maps to `startyear` and `endyear`. | Provider format/bounds plus integration ordering check |
| `timeSlices` | Optional positive integer. Maps to `timeslices`. | Provider fact |
| `regionalSelection` | Optional object with a 1-6-character `variableCode` and one or more unique value codes of at most 8 characters. Maps to `regionalvariable` and comma-separated `regionalkey`. | Provider bound plus integration structure |
| `classifyingSelections` | Optional array of unique variable selections. Each variable code is 1-6 characters and each unique value code is at most 15 characters. Maps by position to `classifyingvariableN` and comma-separated `classifyingkeyN`. | Provider bound plus integration structure |
| `updatedAfter` | Optional real calendar date in `dd.mm.yyyy` or `dd.mm.yyyy hh:mm` form. Maps to provider `stand`. | Provider format plus integration calendar validation |

Commas and control characters are rejected inside individual codes because commas delimit the provider form fields. Duplicate value codes and duplicate classifying variables are rejected before a request is sent. These are **integration safety choices**.

### `search_catalog`

- `term`: required non-empty keyword or phrase.
- `category`: `all`, `tables`, `statistics`, `cubes`, `variables`, or `time_series`; default `all`.
- `pageLength`: integer 1-1000; default 50. The provider documents a higher maximum of 25,000, while 1,000 is an integration response-size choice.
- Output: `items[]` with stable `type`, `code`, and `title`, plus optional state, time range, last update, value count, information flag, warning, and copyright.

### `get_metadata`

- `objectType`: required `table`, `cube`, `statistic`, `time_series`, `variable`, or `value`.
- `code`: required 1-15-character object code.
- `area`: defaults to `public`.
- Output: object type, code, optional title/update/time range, optional summarized dimensions, provider-specific metadata, warning, and copyright. Raw request parameters are not included.

### `list_variable_values`

- `variableCode`: required 1-15-character variable code; maps to provider `name`.
- `selection`: 1-15-character code/title pattern; defaults to `*`.
- `searchCriterion`, `sortCriterion`: `code` or `content`; both default to `code` and map to the provider's localized criterion values.
- `area`: defaults to `public`.
- `pageLength`: integer 1-1000; default 100. Results are capped to this value even if the provider returns more.
- Output: variable code, structured value codes/titles, optional counts/information flags, warning, and copyright.

### `download_table`

- `tableCode`: required 1-10-character table code; maps to `name`.
- `format`: `csv`, `datencsv`, `ffcsv`, `html`, `genml`, or `xlsx`; default `ffcsv`.
- `compress`: boolean, default `false`; suppresses empty rows and columns and does not control ZIP packaging.
- `transpose`: boolean, default `false`; swaps rows and columns.
- At most five classifying selections are accepted, matching the provider's numbered table fields.
- `job` is always `false` and is not exposed as input.
- Output contains only `tableCode`, `format`, `fileName`, `mimeType`, `byteLength`, and `isArchive`; file contents are provided as a downloadable file.

### `download_cube`

- `cubeCode`: required 1-10-character cube code; maps to `name`.
- `includeValues`: boolean, default `true`; maps to `values`.
- `includeMetadata`: boolean, default `true`; maps to `metadata`.
- `includeAdditionalMetadata`: boolean, default `false`; maps to `additionals`.
- At most three classifying selections are accepted, matching the provider's numbered cube fields.
- Format is always CSV and is not exposed as input.
- Output contains only `cubeCode`, the constant `csv` format, `fileName`, `mimeType`, `byteLength`, and `isArchive=false`; file contents are provided as a downloadable file.

## File formats and validation

### Provider behavior

- Table `csv`, `datencsv`, and `ffcsv` downloads are ZIP archives. Flat CSV is intended for structured downstream processing.
- XLSX is the layout-oriented spreadsheet option; HTML and GENML are also supported by `tablefile`.
- `cubefile` returns linearized CSV and supports `values`, `metadata`, and `additionals` flags.
- English responses can still contain untranslated metadata.

### Integration safety choices

- Any outer file response above 64 MiB is rejected before encoding or parsing.
- ZIP and XLSX archives allow at most 4,096 entries and 32 MiB total expanded content. Each entry is rejected when its expanded size exceeds 200 times its compressed size plus 1 MiB.
- Multi-disk, ZIP64, encrypted, unsupported-compression, duplicate-name, unsafe-path, inconsistent-header, size, CRC, and malformed-central-directory archives are rejected. CSV archives must contain a CSV entry. XLSX archives must contain the expected safe OOXML workbook, worksheet, relationship, and content-type structure. The required package office-document relationship and workbook-referenced worksheet relationships must resolve to internal package parts; unrelated OOXML relationship parts are not exhaustively inspected.
- GENML/XML is limited to 32 MiB, 64 nested elements, and 100,000 elements. DTD declarations, malformed XML, unexpected document roots, and error/fault documents are rejected. The parser does not fetch external resources.
- CSV and HTML validation inspects at most the first 1 MiB for an expected document shape and rejects gateway/error pages or incompatible MIME types.
- File names are reduced to safe leaf names, control characters and leading dots are removed, and the extension is canonicalized for the selected format.

MIME and extension outcomes:

| Request | Downloaded outcome |
| --- | --- |
| Table `csv`, `datencsv`, `ffcsv` | `.zip`, `application/zip`, `isArchive=true` |
| Table `xlsx` | `.xlsx`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `isArchive=false` |
| Table `html` | `.html`, validated HTML-compatible MIME, `isArchive=false` |
| Table `genml` | `.xml`, validated XML-compatible MIME, `isArchive=false` |
| Cube | `.csv`, `text/csv`, `isArchive=false` |

No binary or base64 file contents are placed in structured outputs.

## Explicit exclusions and non-goals

- No arbitrary form-field or endpoint passthrough.
- No asynchronous `job=true` mode or result-queue polling.
- No username/password authentication.
- No profile, password, saved-result, or other mutation operations.
- No inline binary or base64 data in structured output.
- No write tools, triggers, or webhooks.
- No arbitrary provider response dumps for catalogue values; outputs are normalized for stable downstream use.
- No promise of complete English translation when the provider returns German metadata.

## Testing and maintenance expectations

- Unit tests cover auth validation, request mapping, JSON envelope normalization, code `98` and `104` handling, secure error redaction, structured selection encoding, file validation, and each tool workflow.
- `src/tools.schema.test.ts` must cover every registered action in stable order, top-level object compatibility, tool ID length, defaults/bounds, output metadata shape, marketplace metadata, and provider-facing public copy.
- Package tests, package typecheck, package build, repository formatting/lint, link checks, SVG validation, and secret/public-language scans are required before landing changes.
- A private live E2E suite should exercise all five tools with a dedicated token profile and small public datasets; it must narrow downloads and needs no provider-resource cleanup because the surface creates or mutates no provider resources.
- Tool-use evals are expected when tool descriptions, input schemas, workflow guidance, or behavior affecting schema-only selection changes. At minimum they should test search-to-metadata discovery, value-code discovery before filtered downloads, and choosing table versus cube download.
- Business-logic changes require a normal release version bump under repository policy. This documentation/schema task intentionally retains version `0.1.0-rc.1`.

## Known maintenance note

The current OOXML structural lookup normalizes XML element names to lowercase, so mixed-case element-name variants can be accepted during workbook validation. This is a known non-blocking review note. The integration does not claim strict XML element-name case validation; a future business-logic change may tighten it with dedicated regression tests.

## Attribution and logo provenance

The bundled `logo.svg` was fetched unchanged from the [official logo URL](https://www.destatis.de/SiteGlobals/Frontend/Images/logo.svg?__blob=normal&v=11), which the [Destatis homepage](https://www.destatis.de/EN/Home/_node.html) references in its header. The file is valid SVG and contains paths and rectangles only; it contains no scripts, event handlers, embedded external resources, or executable content.

The [Destatis legal notice](https://www.destatis.de/DE/Service/Impressum/_inhalt.html) permits reproduction and distribution of general website content, including graphics, with source attribution unless a page or product states otherwise. The notice separately restricts the chatbot logo; the bundled asset is the standard homepage header logo, not the chatbot logo. Attribution: © Statistisches Bundesamt (Destatis), 2026. GENESIS-Online data is separately published under Data Licence Germany - Attribution - Version 2.0.
