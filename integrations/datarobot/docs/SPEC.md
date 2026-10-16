# DataRobot integration

Connect using an API key from **API keys and tools** and your DataRobot instance URL. The URL must use HTTPS; `/api/v2` is optional. Existing saved instance URLs remain supported, while an instance URL provided with new credentials takes precedence. If neither is present, the integration uses `https://app.datarobot.com`.

The 30 tools cover these workflows:

| Area | Tools and behavior |
| --- | --- |
| Identity | `get_current_user` reads the connected user from `/account/info/`. |
| Projects | `list_projects`, `get_project`, `create_project`, and `manage_project` discover, create, rename, and delete projects. Project creation accepts exactly one dataset URL or AI Catalog dataset ID. |
| Modeling | `start_autopilot`, `list_models`, and `get_model` expose training configuration, leaderboard metrics, and computed feature impact. `list_blueprints` and `list_feature_lists` discover modeling resources. `request_feature_impact` starts computation before retrieving scores with `get_model`. |
| Datasets | `list_datasets`, `get_dataset`, `manage_dataset`, and `download_dataset` manage catalog datasets and download original persisted CSV data. A supplied name is applied after URL ingestion. |
| Registry | `list_model_packages`, `get_model_package`, and `register_model` discover and register deployment-ready model versions. Registration uses the current `fromLeaderboard` API. |
| Deployments | `list_deployments`, `get_deployment`, `create_deployment`, and `manage_deployment` create, update, replace, and delete deployments. A learning-model deployment first registers the model, then deploys its package. `list_prediction_servers` and `list_prediction_environments` discover infrastructure IDs. |
| Predictions | `make_predictions` sends structured rows to the **serverless** prediction endpoint. `create_batch_prediction_job` scores an AI Catalog dataset to local-file output; `get_batch_prediction_job` polls status and `download_batch_predictions` downloads the completed CSV. Dedicated-server real-time predictions require a separate endpoint and authentication flow. |
| Monitoring | `get_deployment_monitoring` retrieves requested service statistics, accuracy, feature drift, and target drift. Provider failures are reported instead of appearing as empty monitoring data. |
| Model files | `download_model_artifact` downloads training artifacts or persistent logs for blueprints containing custom tasks. |

Creation waits for documented asynchronous status locations when supplied. A timed-out job may still complete; check the resource before repeating a create operation. A registered model package can require further build time before deployment. Model replacement reasons are `ACCURACY`, `DATA_DRIFT`, `ERRORS`, `SCHEDULED_REFRESH`, `SCORING_SPEED`, `DEPRECATION`, and `OTHER`; omission selects `OTHER`.

List tools expose their existing offset/limit controls. Returned total counts come from provider totals. Existing numeric input schemas remain compatible; values required to be integers are validated at runtime. The legacy model-list route is retained because it supplies the complete existing leaderboard fields and ordering contract.

Downloads are delivered as downloadable files with metadata. Credentials and credential-bearing URL parameters are removed from public provider records. Existing nullable response fields retain their null values; provider nulls or numeric labels that cannot fit older optional scalar fields remain available in `raw`.

No triggers are registered. Custom model authoring, external-source credential administration, compliance-document generation, advanced time-series setup, and notification subscriptions are outside the registered tool surface.

Official references, checked 2026-10-15:

- [Authentication and API keys](https://docs.datarobot.com/en/docs/platform/acct-settings/api-key-mgmt.html)
- [Projects and Autopilot](https://docs.datarobot.com/en/docs/api/reference/public-api/projects.html)
- [DataRobot models](https://docs.datarobot.com/en/docs/api/reference/public-api/datarobot_models.html)
- [Data registry](https://docs.datarobot.com/en/docs/api/reference/public-api/data_registry.html)
- [Model registry](https://docs.datarobot.com/en/docs/api/reference/public-api/model_management.html)
- [Deployment management](https://docs.datarobot.com/en/docs/api/reference/public-api/deployment_management.html)
- [Model replacement](https://docs.datarobot.com/en/docs/api/reference/public-api/deployment_model_replacement.html)
- [Serverless Prediction API](https://docs.datarobot.com/en/docs/api/reference/predapi/pred-ref-serverless/index.html)
- [Batch predictions](https://docs.datarobot.com/en/docs/api/reference/public-api/batch_predictions.html)
- [Service health](https://docs.datarobot.com/en/docs/api/reference/public-api/observability_service_health.html), [accuracy](https://docs.datarobot.com/en/docs/api/reference/public-api/observability_accuracy.html), and [drift](https://docs.datarobot.com/en/docs/api/reference/public-api/observability_drift.html)
- [Official Python SDK 3.20.0 distribution](https://pypi.org/project/datarobot/3.20.0/) for prediction server, feature-list/blueprint, and registration request/response behavior where the current REST pages are incomplete
