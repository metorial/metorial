# <img src="logo.png" height="20"> 21 Risk

Read organizations, sites, audits, risk models, categories, corrective actions, compliance data, members, property insurance items, and COPE data from the existing 21RISK OData v5 connection.

Create an API key in [account settings](https://21risk.com/profile/account). Existing API-key connections remain compatible.

Collection tools accept OData query options. `top` and `skip` must be non-negative whole numbers. When a result includes `nextLink`, pass that value alone to the same tool for the next page. `count` is the number of records in the returned page; `totalCount` appears only when the provider supplies a numeric total. Record fields returned by the provider remain available, including fields outside the listed optional summaries.

The provider's [current REST API overview](https://21risk.com/tools/rest-api) describes newer API capabilities but does not publish an endpoint-level contract for this legacy OData surface. Existing routes and query fields are retained; support for each field and expansion depends on the connected provider API. No write operations or file downloads are exposed by this integration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
