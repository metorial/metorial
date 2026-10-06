# <img src="logo.svg" height="20"> NetSuite

Discover NetSuite record types and native metadata available to your account and role. Read records, filter collections, run SuiteQL queries, and create, update, upsert, delete or transform records where the native API supports the operation.

Connect with OAuth 2.0 authorization code authentication or token-based authentication (TBA). OAuth requests only the `rest_webservices` scope and supports token renewal. Account IDs bind the connection to its original account; sandbox IDs such as `12345_SB1` use the host `12345-sb1`.

Start with `list_record_types`, then use `get_record_metadata` to inspect operations and fields before changing records. Collection pages return native IDs and links. Use `get_record` for record fields, or `query_suiteql` for queries. Pagination accepts an integer limit of 1–1000 and an offset divisible by that limit.

Record changes can invoke scripts, workflows, notifications and financial effects. Deleting a record does not undo previous accounting activity. Verify your role permissions, record dependencies and native sublist rules before writing. File Cabinet operations, RESTlets, asynchronous jobs and record actions are outside this integration's tool set.

Oracle will block new TBA integrations in NetSuite 2027.1. Existing TBA support is tentatively scheduled to end in 2028.2; use OAuth 2.0 for new setups and plan migration. See Oracle's [TBA migration guidance](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0525020842.html).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
