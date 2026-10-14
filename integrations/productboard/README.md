# <img src="https://provider-logos.metorial-cdn.com/productboard.jpg" height="20"> Productboard

Read current Productboard entity records, discover workspace entity configurations, and inspect the connected OAuth user.

## API availability

Productboard made API v2 generally available on April 9, 2026 and announced that API v1 endpoints would become unavailable after **July 8, 2026**. See the [official sunset announcement](https://developer.productboard.com/v1.0.0/changelog/2026-04-09).

`list_entity_configurations` and `list_entities` use API v2. `get_current_user` uses the current OAuth token information endpoint and requires an OAuth connection. The entity tools also support API token connections. Existing OAuth connections may need to reconnect to grant `entities:read`; personally identifying entity fields can be redacted because extra PII scopes are not requested.

Every other tool in this package still targets API v1 and is unavailable under the announced sunset. Their keys and input contracts are retained for compatibility; this release does not migrate their create, update, delete, notes, hierarchy, release, objective, initiative, user, company, or custom-field operations to API v2.

## Current tools

### List Entity Configurations

Discover available entity types, fields, filters, and validation rules. Use returned types with `list_entities`. Continue with the returned `pageCursor` when another page is available.

### List Entities

Read one page of current entity records, optionally filtered by type, name, archived state, or parent. Results expose IDs, types, fields, and links. Pass the returned `pageCursor` with the same filters to read the next page. The provider controls page size.

### Get Current User

Inspect the connected OAuth user's name and email, workspace, application ID, granted scopes, and token lifetime. API token connections receive an actionable validation error without making a provider request.

## Legacy API v1 tools (unavailable)

### Create Feature

Create a new feature in the product hierarchy. Features can be nested under products, components, or other features. You can set a status, assignee, timeframe, and description.

### Create Note

Create a new note (feedback item) on the Insights board. Notes capture product ideas, requests, and feedback from any source. You can associate notes with users, companies, tags, and a source URL.

### Delete Feature

Permanently delete a feature from the product hierarchy. This action cannot be undone.

### Delete Note

Permanently delete a note from the Insights board. This action cannot be undone.

### Get Feature

Retrieve a single feature by its ID. Returns the full feature details including name, description, status, parent hierarchy, timeframe, and assignee.

### Get Note

Retrieve a single note by its ID. Returns full note details including title, content, tags, and associated user information.

### List Feature Statuses

List all available feature statuses in the workspace. Use these status IDs when creating or updating features.

### List Features

List features from the product hierarchy. Supports pagination and filtering by update time. Returns features with their status, parent hierarchy, timeframes, and assignments.

### List Notes

List notes (feedback items) from the Insights board. Supports pagination and filtering by update time.

### List Product Hierarchy

List products and components in the product hierarchy. Returns both products and their components in a single call, giving a view of the workspace structure. Use the returned IDs when creating or organizing features.

### List Companies

List companies that provide feedback. Companies can be associated with users and notes.

### List Custom Fields

List all custom field definitions in the workspace. Returns field names, types, and IDs that can be used to read or set values on features, products, and components.

### List Initiatives

List initiatives in the workspace. Initiatives are larger product efforts that span multiple features and can be linked to objectives.

### List Key Results

List key results, optionally filtered by objective. Key results are measurable outcomes linked to objectives.

### List Objectives

List objectives in the workspace. Objectives represent strategic goals that align product work.

### List Releases

List releases and release groups for delivery planning. Returns both releases and their groupings.

### List Feedback Users

List feedback users (people who provide feedback, not workspace members). These users can be associated with notes and companies.

### Update Feature

Update an existing feature's properties. You can change name, description, status, parent hierarchy, assignee, and timeframe. Only provided fields are updated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
