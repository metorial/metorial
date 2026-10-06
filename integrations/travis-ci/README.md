# Travis CI

Manage repositories, builds, jobs, CI settings, environment variables, cron schedules, and caches through Travis CI API V3. Discover the connected account and build-request status, validate `.travis.yml`, and download job logs.

## Connection

Use a Travis CI API token from Account Settings > API Token. Select `https://api.travis-ci.com` for hosted public or private repositories, or your Enterprise API root such as `https://YOUR-INSTANCE/api`. Identity checks and operations use the same endpoint. [Travis CI `.org` was retired in June 2021](https://docs.travis-ci.com/user/migrate/open-source-repository-migration/).

The API endpoint now belongs to authentication. Existing saved tool configuration remains a fallback when older credentials have no endpoint. Reconnect an older Enterprise connection to persist its endpoint for correct account identification; changing tool configuration alone does not change authentication.

## Tools

| Tool key | Outcome |
| --- | --- |
| `get_current_user` | Identify the connected account |
| `list_repositories` | Discover repositories with owner, active, starred, or privacy filters |
| `get_repository` | Read, activate/deactivate, or star/unstar a repository |
| `list_builds` | Discover builds with branch, state, and event filters |
| `get_build` | Read build status, commit, branch, and job IDs |
| `trigger_build` | Queue a build request with branch, commit SHA, message, and optional configuration |
| `get_build_request` | Read request processing status and resulting build IDs |
| `list_build_requests` | Inspect repository request history |
| `manage_build` | Request build cancellation or restart and read current status |
| `manage_job` | Read a job or request cancellation, restart, or debug mode |
| `manage_job_log` | Download a text/JSON log or remove its contents |
| `manage_env_vars` | List/read/create/update/delete repository environment variables |
| `manage_repository_settings` | List/read/update CI and log settings |
| `manage_crons` | List/read/create/delete daily, weekly, or monthly branch schedules |
| `manage_caches` | List/delete repository caches by branch and name pattern |
| `list_branches` | Read branches and latest build status |
| `lint_travis_yml` | Report configuration warnings |
| `get_job_log` | Deprecated legacy inline log read/delete; use `manage_job_log` |

Paginated tools retain `totalCount` and return optional `hasMore` and `nextOffset`. Pass `nextOffset` as the next call's `offset` with the same filters and limit.

## Build workflow

Submit `trigger_build`, then read `get_build_request` until it reports build IDs. Use `get_build` and `manage_job` to inspect execution. Cancellation, restart, and debug requests are asynchronous; a successful response does not mean execution has finished. Build generation/restarts require account permissions and available build credits.

For configuration overrides, [explicit merge modes](https://docs.travis-ci.com/user/triggering-builds/#merge-modes) control how the supplied config combines with `.travis.yml`. `replace` uses only the supplied configuration. Omitting `mergeMode` retains the provider default. Configure notifications and deployment steps intentionally before requesting a build.

Private environment values are returned as `null`. Job logs may contain sensitive build output. Log deletion replaces contents with a removal notice. Only one cron exists per repository branch; creating a cron replaces that branch's existing schedule. Permissions and feature availability depend on the selected Travis CI installation and plan.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
