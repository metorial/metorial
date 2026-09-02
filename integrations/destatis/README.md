# <img src="logo.svg" height="20"> Destatis GENESIS-Online

Search, inspect, and download official German statistics from the [Destatis GENESIS-Online](https://genesis.destatis.de/datenbank/online?language=en) database. The integration provides five read-only tools for catalogue discovery, metadata inspection, value-code lookup, and filtered table or cube downloads.

## Setup

1. Register or sign in to [GENESIS-Online](https://genesis.destatis.de/datenbank/online?language=en).
2. Open the **Webservice (API)** modal in the GENESIS-Online account interface and copy the personal API token. The [official API guide](https://genesis.destatis.de/datenbank/online/docs/GENESIS-Webservices_Introduction.pdf) explains where the token is shown and how it can be regenerated.
3. Connect the integration with that token.

The `language` setting accepts `en` or `de` and defaults to `en`. Destatis notes that some metadata is not fully translated, so German text can still appear in English responses.

## Tools and workflows

| Tool | Workflow |
| --- | --- |
| `search_catalog` | Find tables, statistics, cubes, variables, and time series by keyword. The result includes stable provider codes for later calls. |
| `get_metadata` | Inspect a table, cube, statistic, time series, variable, or value. Table and cube results summarize available dimensions when the provider supplies them. |
| `list_variable_values` | Discover valid regional or classifying value codes for a variable, with wildcard matching and code/title sorting. |
| `download_table` | Download a filtered presentation table as flat CSV, CSV, data CSV, XLSX, HTML, or GENML. |
| `download_cube` | Download filtered, linearized cube data as CSV, with options for value labels and metadata. |

A reliable workflow is:

1. Search for a subject, for example population, consumer prices, or employment.
2. Inspect the selected table or cube with `get_metadata`.
3. Call `list_variable_values` for each dimension that needs a regional or classifying filter.
4. Download the narrowed result with `download_table` or `download_cube`.

Example requests include:

- “Find GENESIS tables about monthly consumer prices.”
- “Show the dimensions and available period for table `61111-0002`.”
- “List all value codes for the `DLAND` dimension.”
- “Download a flat CSV table for 2024 through 2026, limited to selected federal states.”
- “Download an XLSX presentation table with rows and columns transposed.”
- “Retrieve a cube as linearized CSV with value labels and metadata.”

## Formats and limits

- `ffcsv` is the default table format and is designed for further processing. Destatis packages `csv`, `datencsv`, and `ffcsv` table downloads as ZIP files. XLSX, HTML, and GENML are returned in their respective file formats. Cube downloads are CSV files.
- The provider does not directly return tables with more than 40,000 values. Narrow the year range, recent time slices, contents, regional values, or classifying values when a table is too large.
- A downloaded response is limited to 64 MiB. ZIP and XLSX contents are also limited to 32 MiB after expansion, and GENML/XML files are limited to 32 MiB.
- Archives with more than 4,096 entries, unsafe paths, corrupt records, or extreme expansion ratios are rejected. XML files with unsafe declarations or excessive nesting or element counts are also rejected.
- Personal-token authentication cannot use the provider's asynchronous table-job mode. This integration always performs direct, read-only requests and does not change account or database state.
- Provider wildcard codes can be used for regional and classifying values. Explicit value codes within one selection must be unique.

The downloaded data remains subject to the [Data Licence Germany - Attribution - Version 2.0 and the current Destatis copyright notice](https://www.destatis.de/DE/Service/Impressum/_inhalt.html). Retain the attribution returned by GENESIS-Online when republishing results.

## Official sources

- [GENESIS-Online API and web interface overview](https://www.destatis.de/EN/Service/OpenData/api-webservice.html)
- [GENESIS web services guide](https://genesis.destatis.de/datenbank/online/docs/GENESIS-Webservices_Introduction.pdf)
- [GENESIS-Online service announcements](https://genesis.destatis.de/datenbank/online/announcement)
- [Destatis legal notice and reuse terms](https://www.destatis.de/DE/Service/Impressum/_inhalt.html)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
