# <img src="https://provider-logos.metorial-cdn.com/databricks.png" height="20"> Databricks

Manage Databricks workspaces, clusters, jobs, and data assets. Create, start, stop, and configure Apache Spark clusters. Orchestrate multi-task workflows and data pipelines with scheduled or triggered jobs. Execute SQL statements on SQL warehouses. Manage Unity Catalog resources including catalogs, schemas, tables, and volumes for data governance. Track ML experiments, manage model registry, and deploy model serving endpoints. Create and manage vector search indexes. Import, export, and organize notebooks and workspace files. Upload and download files via DBFS and Unity Catalog Volumes. Manage users, groups, service principals, and permissions. Create and publish Lakeview dashboards. Share data across organizations with Delta Sharing. Store and manage secrets for secure credential access. Receive webhook notifications for model registry events and job lifecycle events.

## Tools

### Browse Unity Catalog

Navigate the Unity Catalog hierarchy: list catalogs, schemas within a catalog, tables within a schema, or get details of a specific table. Provides governance metadata including owners, comments, and data types.

### Browse Workspace

List notebooks, folders, and other objects in a workspace directory. Can also get the status (metadata) of a specific workspace object.

### Execute SQL

Execute a SQL statement on a SQL warehouse and return the results. Supports catalog and schema context, and can wait for completion or return a statement ID for asynchronous polling.

### Get Job Run

Retrieve details and status of a specific job run, including task states, timing, and output. Can also list recent runs for a given job.

### List Clusters

List all available Apache Spark clusters in the workspace. Returns cluster details including state, configuration, and scaling settings.

### List MLflow Experiments

List MLflow experiments in the workspace. Experiments are containers for organizing ML runs.

### List Jobs

List jobs defined in the workspace. Optionally filter by name and expand task details.

### List Pipelines

List Delta Live Tables pipelines in the workspace. Optionally filter by name or other criteria.

### List Serving Endpoints

List all model serving endpoints in the workspace. Serving endpoints host ML models and foundation models as REST APIs.

### List SQL Warehouses

List all SQL warehouses in the workspace with their status and configuration.

### Manage Cluster

Create, edit, start, restart, stop, or permanently delete an Apache Spark cluster. To **create** a new cluster, omit \

### Manage DBFS

Interact with the Databricks File System (DBFS). List, read, upload, create directories, and delete files or folders.

### Manage Job

Create or delete a multi-task workflow job. Supports notebook, Python, and SQL task types with dependencies, scheduling, and notification settings.

### Manage Notebook

Import, export, or delete notebooks and create workspace directories. Use **import** to upload notebook content (base64-encoded). Use **export** to download a notebook. Use **delete** to remove a notebook or folder.

### Manage Pipeline

Create, start, stop, or delete Delta Live Tables pipelines. Pipelines define declarative data transformations as directed acyclic graphs.

### Manage Secrets

Manage secret scopes and secrets. Create/delete scopes, put/delete secrets, or list scopes and secret keys. Secret values cannot be read back — only metadata is returned.

### Manage SQL Warehouse

Create, start, stop, or delete a SQL warehouse. SQL warehouses are compute resources for running SQL queries in Databricks SQL.

### Query Serving Endpoint

Send an inference request to a model serving endpoint. Works with both custom ML models and Foundation Model APIs. The request format follows OpenAI-compatible chat/completions or generic model input schemas.

### Run Job

Trigger an immediate run of an existing job, optionally with override parameters. Also supports cancelling a running job run.

### Search MLflow Runs

Search for MLflow runs across one or more experiments. Filter by metrics, parameters, and tags using the MLflow search syntax. Returns run metadata, metrics, and parameters.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
