# Travis CI API integration

This integration implements the essential CI workflow of the [official API V3](https://developer.travis-ci.com/). See the [tool catalog and migration notes](../README.md) for the public tool keys and connection setup.

## Authentication and installations

Requests use `Authorization: token YOUR_API_TOKEN` and `Travis-API-Version: 3`. Hosted public/private repositories use `https://api.travis-ci.com`; Enterprise uses its installation API root, commonly `/api`. Authentication owns the endpoint and account discovery calls `/user` on that endpoint. Older saved configuration is a fallback for operations, and older Enterprise connections must reconnect for correct identity discovery. The retired `.org` service is unsupported.

## Capability coverage

Repositories, paginated builds/branches/requests, asynchronous trigger/request status, cancel/restart/debug, settings, environment variables, crons, cache selectors, lint warnings, and downloadable text/JSON logs are supported. Nested commit/branch/job details are requested explicitly. Outputs expose identifiers and status while excluding raw build configuration, repository private keys/tokens, and private environment values.

Repository settings accept documented boolean settings and the integer `maximum_number_of_builds`; read or list settings before updating. Build requests support branch, commit SHA, message, configuration, and the five documented merge modes. Build/job transition responses show the latest readable state after acceptance; callers should poll for completion. Lint's `valid` field retains its established meaning of no warnings, rather than guaranteeing a build will succeed.

## Compatibility and files

All fourteen established keys remain available. Additive optional inputs and pagination metadata preserve existing calls. `get_job_log` retains its established inline nullable content and delete action; it is deprecated in favor of `manage_job_log`, which provides downloadable files and metadata without inline log content. Text and JSON use the authenticated `/job/{id}/log` endpoint with the appropriate Accept header. Stable authenticated job-log endpoints need no expiring-link refresh operation.

## Boundaries

There are no event triggers. Account billing, organization administration, scan results, key encryption, custom images, and build priority are outside this tool catalog. Starting or restarting CI can consume credits and run the selected repository configuration. Scheduled crons likewise execute branch configuration, and creating a cron replaces any existing schedule on that branch. Settings, activation, secret, cache, and log mutations require appropriate repository permissions.

Official references: [build requests](https://docs.travis-ci.com/user/triggering-builds/), [settings](https://developer.travis-ci.com/resource/setting), [logs](https://developer.travis-ci.com/resource/log), [pagination](https://developer.travis-ci.com/pagination), and [hosted migration](https://docs.travis-ci.com/user/migrate/open-source-repository-migration/).
