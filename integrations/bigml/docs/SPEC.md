# BigML Integration

The integration uses BigML's HTTPS REST API at `https://bigml.io/andromeda` or `https://au.bigml.io/andromeda`. Authentication uses the account username and API key as query parameters. Organization scope applies to project management and account status; project scope applies to other resources. A project selected in a tool takes precedence over the connection's default project. The optional legacy `devMode` setting is retained for saved connections, but uses the production environment because BigML retired development mode.

BigML's resource families share one API and account model, so tools do not require separate product categories. No current-user profile endpoint is asserted: `get_account_status` returns only the account information supplied by the real `/status` endpoint.

## Tools

| Workflow | Tools |
| --- | --- |
| Data preparation | `create_source`, `create_inline_source`, `create_dataset` |
| Model training | `train_model`, `train_unsupervised_model`, `create_cluster`, `create_anomaly_detector`, `create_optiml` |
| Predictions and scoring | `create_prediction`, `create_batch_prediction`, `download_batch_prediction`, `create_forecast`, `create_centroid`, `create_anomaly_score` |
| Evaluation and automation | `create_evaluation`, `execute_whizzml` |
| Resource organization | `list_resources`, `get_resource`, `update_resource`, `delete_resource`, `manage_project`, `get_account_status` |

`train_model` supports decision trees, ensembles, deepnets, logistic regression, linear regression, and time series. `train_unsupervised_model` supports associations, topic models, and PCA using the same dataset and metadata inputs for every algorithm. Specialized training options remain available through the existing cluster and anomaly tools.

Resource creation and training can be asynchronous. Output status codes and messages come directly from BigML; `5` means finished and `-1` means faulty. Resource responses preserve the complete provider data in `raw` alongside existing output fields. List pagination links have authentication parameters removed before output. List responses retain provider totals and page metadata; limits are integer values from 1 to 200 and offsets are nonnegative integers. Extra filters cannot override credentials or organization scope. Resource IDs and numeric provider requirements are checked at runtime without changing existing input types.

`execute_whizzml` accepts either a script ID or inline source, validates named input pairs, and waits for the script to compile before creating an execution. A compilation timeout identifies the real script so it can be checked and executed later. Optional input/output declarations configure new inline scripts. Execution output values remain in the existing `outputs` field and complete execution data is preserved in `raw`.

A completed batch prediction can be downloaded as CSV through `download_batch_prediction`. The download uses BigML's authenticated GET endpoint and the connection's current credentials. No expiry is invented for this stable resource endpoint.

## Official references

- [Authentication](https://bigml.com/api/authentication.md), [organizations](https://bigml.com/api/organizations.md), [requests and pagination](https://bigml.com/api/requests.md), [response and error format](https://bigml.com/api/responses.md), [status codes](https://bigml.com/api/status_codes.md).
- [Sources](https://bigml.com/api/sources.md), [datasets](https://bigml.com/api/datasets.md), [models](https://bigml.com/api/models.md), [ensembles](https://bigml.com/api/ensembles.md), [deepnets](https://bigml.com/api/deepnets.md), [logistic regressions](https://bigml.com/api/logistic_regressions.md), [linear regressions](https://bigml.com/api/linear_regressions.md), [time series](https://bigml.com/api/timeseries.md).
- [Predictions](https://bigml.com/api/predictions.md), [batch predictions and CSV download](https://bigml.com/api/batchpredictions.md), [forecasts](https://bigml.com/api/forecasts.md), [centroids](https://bigml.com/api/centroids.md), [anomaly scores](https://bigml.com/api/anomalyscores.md), [evaluations](https://bigml.com/api/evaluations.md).
- [Clusters](https://bigml.com/api/clusters.md), [anomalies](https://bigml.com/api/anomalies.md), [OptiML](https://bigml.com/api/optimls.md), [associations](https://bigml.com/api/associations.md), [topic models](https://bigml.com/api/topic_models.md), [PCA](https://bigml.com/api/pcas.md), [projects](https://bigml.com/api/projects.md), [scripts](https://bigml.com/api/whizzml_scripts.md), [executions](https://bigml.com/api/whizzml_executions.md).
- [Official Python SDK at commit 73c97000235fda8ca988f20df5c57fdf4bf2f40f](https://github.com/bigmlcom/python/blob/73c97000235fda8ca988f20df5c57fdf4bf2f40f/bigml/api.py) documents retired development mode, account status, and its alternate `query_total` count field. [Its connection implementation](https://github.com/bigmlcom/python/blob/73c97000235fda8ca988f20df5c57fdf4bf2f40f/bigml/bigmlconnection.py) confirms organization/project request scoping and the account status GET request.

No triggers are registered. This refresh does not assert webhook lifecycle support or provider runtime verification.
