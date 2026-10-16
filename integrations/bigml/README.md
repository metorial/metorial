# <img src="logo.jpeg" height="20"> BigML

Import data from remote URLs or inline CSV/JSON, prepare datasets, train supervised and unsupervised models, and generate predictions, forecasts, centroid assignments, and anomaly scores. Create batch predictions and download their CSV results. Evaluate models, run OptiML searches, execute WhizzML workflows, organize projects, and discover or manage resources with filters and pagination.

Connect with a BigML username and API key. Optional organization and project credentials scope requests to resources you can access. Project IDs can be discovered with `list_resources` using the `project` resource type. Account task and subscription information is available through `get_account_status`.

Creation is generally asynchronous. Use `get_resource` until the resource's status code is `5` before using its results. The legacy development-mode setting is retained for saved connections; BigML retired the separate development environment, so requests use the production API.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
