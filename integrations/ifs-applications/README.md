# <img src="https://ifs-p-001.sitecorecontenthub.cloud/api/public/content/ifs_logo_negative_rgb-1.svg-ac1100?v=1194de8e" height="20"> IFS Cloud / IFS Applications

Discover IFS Cloud / IFS Applications projection APIs, export tenant OpenAPI documents, and query bounded OData records from enabled projections.

## Authentication

IFS Cloud uses OAuth 2.0 through IAM clients. This integration supports service integrations with the OAuth 2.0 client credentials flow. Provide the tenant token URL, client ID, client secret, and optional scope from the IFS IAM client configuration.

Configure the tenant `baseUrl` separately in integration config. Use the root tenant URL, such as `https://example.ifscloud.com` or `https://example.com:48080`, without `/main`, `/int`, or `/b2b`.

## Tools

### List API Projections

List projection metadata from `AllProjections.svc/Projections`. Use this first to discover which Premium, Integration, Standard, or entity-service APIs are enabled for the tenant.

### Export Projection OpenAPI

Export an OpenAPI v3 or v2 document for one projection. The JSON is returned as a Slate attachment so large schemas do not appear inline in tool output.

### Query Projection Records

Query one entity set from a selected projection with bounded OData `$select`, `$filter`, `$orderby`, `$top`, and skip-token pagination. Defaults to the `int` projection endpoint, with `main` and `b2b` available when API Explorer, OpenAPI, or a service URL shows that route. Projection and entity-set names are strict identifiers to prevent arbitrary URL access.

## Notes

IFS API availability is tenant and release dependent. This initial package intentionally exposes discovery and generic read-only querying only. Customer, supplier, order, invoice, project, inventory, and write tools should be added after a customer-provided API Explorer or `$openapi` export confirms the exact projection and entity-set names.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
