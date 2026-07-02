# <img src="https://provider-logos.metorial-cdn.com/productboard.jpg" height="20"> Productboard

Manage product roadmaps, feedback, and feature prioritization. Create, read, update, and delete features, notes (feedback), releases, objectives, key results, and initiatives. Organize product hierarchy including products, components, and features with custom fields. Collect and manage user feedback and notes from any source. Plan delivery timelines with releases and release groups. Align product work with strategic goals through objectives and initiatives. Manage companies and users associated with feedback. Subscribe to webhooks for feature, note, component, and product change events. Integrate with external tools via plugin integrations for two-way sync workflows.

## Tools

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
