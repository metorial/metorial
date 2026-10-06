# <img src="https://provider-logos.metorial-cdn.com/mode.png" height="20"> Mode

Read and manage Mode reports, SQL queries, collections, datasets and reusable SQL definitions. Inspect asynchronous runs, download existing results as CSV, JSON or PDF, and manage recurring report schedules.

Connect a paid Mode workspace using its workspace slug, API token and secret. Workspace API tokens have administrator access. Existing personal tokens retain the user's permissions; Mode no longer issues new personal tokens. The connection verifies credentials and access to the selected workspace. Existing connections with a workspace slug in configuration continue to work.

| Tools | Capabilities |
| --- | --- |
| Get Current Account | Verify credentials and identify the authorized configured workspace |
| Get Report / List Reports / Manage Report | Read, update, move, archive, unarchive or delete reports |
| Manage Query | Create, list, update or delete SQL queries in a report |
| Run Report / Get Report Run / List Report Runs | Request asynchronous execution and inspect report/query-run status |
| Download Results | Download successful report results as CSV, JSON or PDF; query results as CSV or JSON |
| List Collections / Manage Collection | Read, create, update or delete empty collections |
| List Datasets / Manage Dataset | Read by collection/data source, update, move or delete datasets |
| List Data Sources | Discover connections and numeric IDs needed for SQL queries and definitions |
| List Definitions / Manage Definition | Read, create, update or delete reusable SQL definitions |
| List Report Schedules / Manage Report Schedule | Read and manage recurring executions |
| List Members | Read workspace memberships and roles |

Lists follow provider pagination when no page is requested. An explicit page returns one page and available pagination metadata. Dataset listing requires exactly one collection or data source; report listing can read the entire workspace.

Executing reports runs their SQL and notebooks and may incur warehouse costs or other configured effects. Schedules repeat those effects and may notify existing subscribers. Downloads read existing results, accept files up to 50 MiB and do not execute reports. PDF exports apply to a whole report run. Permanent deletion cannot be undone.

The current Mode API does not provide general report or dataset creation in this integration. Workspace tokens cannot clone reports. Data-source administration, invitations, subscription changes and notebook editing are outside this tool set.

[Official Mode API reference](https://mode.com/developer/api-reference/introduction/).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
