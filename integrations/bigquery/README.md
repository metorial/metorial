# <img src="https://provider-logos.metorial-cdn.com/bigquery.svg" height="20"> Bigquery

Execute SQL queries against BigQuery datasets, including DML and DDL statements. Create, update, list, and delete datasets and tables with support for partitioning, clustering, and nested fields. Load data from local files or Cloud Storage in formats like CSV, JSON, Avro, and Parquet, and stream data in real time. Export table data to Cloud Storage. Manage asynchronous jobs for queries, loads, exports, and copies. Query external data sources including Cloud Storage, Bigtable, Spanner, and Google Sheets via federated queries. Create and manage machine learning models using BigQuery ML with SQL. Define and manage scheduled queries and data transfer pipelines. Share datasets across organizations via Analytics Hub. Manage IAM permissions and data policies for column-level security. Create user-defined functions and stored procedures. Monitor BigQuery activity through audit log events routed to Pub/Sub.

## Tools

### Execute SQL Query

Run a GoogleSQL (standard SQL) query against BigQuery. Supports SELECT, DML (INSERT, UPDATE, DELETE, MERGE), and DDL (CREATE, ALTER, DROP) statements. The query is submitted as a job, polled for completion, and results are returned. Parameterized queries are supported for safe value interpolation. You can optionally write results to a destination table.

### Export Table to Cloud Storage

Export a BigQuery table to Google Cloud Storage as CSV, JSON, or Avro. Creates an asynchronous extract job. Use wildcards in the destination URI for sharded exports of large tables (e.g., gs://bucket/file-\*.csv).

### Load Data from Cloud Storage

Load data from Google Cloud Storage into a BigQuery table. Supports CSV, JSON (newline-delimited), Avro, Parquet, ORC, Datastore, and Firestore export formats. Creates an asynchronous load job and returns the job status.

### List Datasets

List all datasets in the configured BigQuery project. Returns dataset IDs, friendly names, locations, and labels. Use the **filter** parameter to narrow results.

### List Jobs

List BigQuery jobs in the project. Jobs include queries, loads, exports, and copy operations. Filter by state, time range, or parent job.

### List Routines

List user-defined functions (UDFs), stored procedures, and table-valued functions in a BigQuery dataset.

### List Tables

List all tables, views, and materialized views in a BigQuery dataset. Returns table IDs, types, creation times, and expiration info.

### Read Table Data

Read rows directly from a BigQuery table without running a query job. Useful for quickly inspecting table contents. For complex filtering or aggregation, use **Execute SQL Query** instead.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
