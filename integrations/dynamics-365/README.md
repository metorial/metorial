# <img src="https://provider-logos.metorial-cdn.com/Dynamics%20365%20Icon.svg" height="20"> Dynamics 365

Create, read, update, and delete CRM and ERP records across Dynamics 365 entities including accounts, contacts, leads, opportunities, and cases. Query data with advanced filtering, sorting, pagination, and FetchXML aggregation. Manage relationships between entities by associating and disassociating records. Discover and inspect metadata, schema definitions, and entity attributes. Invoke built-in and custom functions and actions (e.g., WhoAmI, InitializeFrom). Detect duplicate records using configurable rules. Search across multiple entities with full-text relevance search. Upload and download files and images attached to entity columns. Receive real-time webhook notifications on record create, update, delete, assign, and status change events.

## Tools

### Create Record

Create a new record in any Dynamics 365 entity (e.g., accounts, contacts, leads, opportunities, cases, or custom entities). Supports duplicate detection when enabled. Use **@odata.bind** annotations in the record data to associate new records with existing ones during creation.

### Delete Record

Permanently delete a record from any Dynamics 365 entity. This action cannot be undone.

### FetchXML Query

Execute a FetchXML query against a Dynamics 365 entity. FetchXML is a proprietary query language that supports aggregation, grouping, and complex joins that are not possible with standard OData queries.

### List Entity Definitions

List all entity (table) definitions in the Dynamics 365 environment. Returns metadata about available entities including their logical names, display names, and entity set names. Useful for discovering which entities are available and their OData entity set names.

### Get Record

Retrieve a single record by its ID from any Dynamics 365 entity. Supports selecting specific columns and expanding related records via navigation properties.

### Invoke Function

Invoke an unbound function in Dynamics 365. Functions are read-only operations that return data without side effects. Common functions include **WhoAmI**, **RetrieveCurrentOrganization**, and **RetrieveTotalRecordCount**.

### List Records

Query and list records from any Dynamics 365 entity with support for OData filtering, sorting, column selection, pagination, and expanding related records. Use this to retrieve multiple records based on criteria. Supports standard OData query options.

### Associate Records

Create an association (relationship) between two existing Dynamics 365 records using a navigation property. Used for linking records through many-to-one, one-to-many, or many-to-many relationships.

### Search Records

Perform a full-text relevance search across multiple Dynamics 365 entities using the Dataverse Search API. Returns results ranked by relevance, useful for finding records when you don't know the exact entity or field to query.

### Update Record

Update an existing record in any Dynamics 365 entity. Only the fields included in the update data will be modified; other fields remain unchanged.

### Who Am I

Retrieve information about the currently authenticated user, including user ID, organization ID, and business unit ID. Useful for verifying connection and getting the current user context.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
