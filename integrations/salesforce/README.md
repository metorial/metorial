# <img src="https://provider-logos.metorial-cdn.com/salesforce.svg" height="20"> Salesforce

Manage CRM data including Accounts, Contacts, Leads, Opportunities, Cases, and custom objects. Create, read, update, and delete records. Query data using SOQL and search across objects using SOSL. Perform bulk data operations for large-scale imports, exports, and migrations. Execute composite requests to batch multiple operations in a single API call. Access analytics, reports, and dashboards. Manage files and attachments associated with records. Interact with Chatter feeds, posts, and groups for social collaboration. Subscribe to real-time change events via Change Data Capture and Platform Events. Manage org metadata including custom objects, fields, layouts, and workflows. Query data using GraphQL for precise data retrieval across related objects.

## Tools

### Composite Request

Execute multiple API subrequests in a single call using the Salesforce Composite API. Supports three modes: - **composite**: Execute a sequence of subrequests where later requests can reference results of earlier ones. - **tree**: Create a parent record and its related child records in a single request. - **collection**: Perform batch CRUD operations on up to 200 records of the same type.

### Create Record

Create a new record in Salesforce for any standard or custom object type. Provide the object type and field values to create the record. Returns the newly created record's ID.

### Delete Record

Delete a Salesforce record by its ID and object type. This permanently removes the record (or moves it to the Recycle Bin depending on org settings).

### Describe Object

Retrieve metadata about a Salesforce object type, including its fields, relationships, record types, and supported operations. Use this to discover the schema of any standard or custom object. If no object type is provided, returns a list of all available objects in the org.

### Get Org Limits

Retrieve the current API usage limits and remaining allocations for the Salesforce org. Shows limits for daily API calls, data storage, file storage, and other governor limits.

### Get Record

Retrieve a single Salesforce record by its ID and object type. Supports fetching specific fields to reduce payload size. Works with any standard or custom sObject (Account, Contact, Lead, Opportunity, Case, custom objects, etc.).

### Manage Bulk Job

Create, monitor, and manage Salesforce Bulk API 2.0 jobs for processing large data volumes. Supports creating ingest jobs (insert, update, upsert, delete), uploading CSV data, closing/aborting jobs, checking status, and retrieving results. Also supports bulk query jobs.

### Manage Chatter

Interact with Salesforce Chatter feeds. Post updates to records, groups, or user feeds, and retrieve feed items. Chatter provides social collaboration features within Salesforce.

### Query Records

Execute a SOQL (Salesforce Object Query Language) query to retrieve records. Supports standard SELECT queries with WHERE, ORDER BY, LIMIT, GROUP BY, and relationship queries. Use **queryAll** mode to include deleted and archived records. Example SOQL: \

### Run Report

Run an existing Salesforce report and retrieve its results, or list available reports. Optionally pass custom filters to override the report's default filters at runtime. Can also retrieve report metadata to understand available columns and filters.

### Search Records

Perform a full-text search across multiple Salesforce objects using SOSL (Salesforce Object Search Language). Unlike SOQL which queries a single object, SOSL searches across multiple objects simultaneously. Example SOSL: \

### Update Record

Update an existing Salesforce record. Provide the object type, record ID, and the field values to update. Only the specified fields will be modified; other fields remain unchanged.

### Upsert Record

Insert or update (upsert) a Salesforce record using an external ID field. If a record with the given external ID value exists, it is updated; otherwise a new record is created. Commonly used for data synchronization with external systems.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
