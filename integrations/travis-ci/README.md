# <img src="https://provider-logos.metorial-cdn.com/travis-ci.png" height="20"> Travis Ci

Manage CI/CD builds, jobs, and repositories on Travis CI. Trigger, restart, and cancel builds and jobs. View build logs and job statuses. Manage repository settings, environment variables, cron jobs, and build caches. Validate .travis.yml configuration files. Access branch build statuses, build request history, and security scan results. Receive webhook notifications for build events.

## Tools

### Get Build

Retrieve detailed information about a specific build, including its state, duration, commit details, and associated jobs.

### Get Job Log

Retrieve or delete the log output for a specific job. Use the text format for plain text output, or json for structured log data.

### Get Repository

Retrieve detailed information about a Travis CI repository, including its build status, settings, and owner. Can also activate, deactivate, star, or unstar a repository.

### Lint Travis CI Config

Validate a .travis.yml configuration file for syntax errors and warnings. Provide the full YAML content and receive a list of warnings if any issues are found.

### List Branches

List branches for a repository with their latest build status. Useful for checking the CI status of each branch. Optionally retrieve detailed info for a specific branch.

### List Build Requests

List the history of build requests for a repository, including those triggered by commits, pull requests, API calls, or cron jobs. Useful for auditing build activity.

### List Builds

List builds for a repository or for the authenticated user. Supports filtering by branch, state, and event type. Results are paginated.

### List Repositories

List repositories accessible to the authenticated user or a specific owner. Supports filtering by active status, starred status, and privacy. Results are paginated.

### Manage Build

Cancel or restart a Travis CI build. Use this to stop a running build or re-run a completed/canceled build.

### Manage Build Caches

List or delete build caches for a repository. Caches store dependencies and artifacts to speed up builds. Can be filtered by branch or name pattern.

### Manage Cron Jobs

List, create, get, or delete scheduled cron builds for a repository. Crons can run daily, weekly, or monthly on a specific branch. Only one cron job is allowed per branch.

### Manage Environment Variables

List, create, update, or delete environment variables for a Travis CI repository. Environment variables can be marked as public or private (encrypted). Private variable values are not returned by the API.

### Manage Job

Get details about a specific job, or cancel, restart, or debug it. Debug mode restarts the job with SSH access enabled for troubleshooting.

### Trigger Build

Trigger a new build for a repository. Optionally specify a branch, custom commit message, and override build configuration. The build request is queued and processed asynchronously.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
