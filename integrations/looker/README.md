# <img src="https://provider-logos.metorial-cdn.com/looker.png" height="20"> Looker

Run queries against LookML models and retrieve results in multiple formats (JSON, CSV, PDF, XLSX). Create, manage, and organize dashboards, Looks, and folders. Schedule recurring data deliveries via email, webhook, S3, and SFTP. Administer users, groups, roles, and permissions. Configure database connections and inspect database metadata (schemas, tables, columns). Manage LookML projects with Git branch operations, deployments, and validation. Generate embed URLs and cookieless sessions for embedding analytics in external applications. Create and manage data-driven alerts on dashboard tiles. Render dashboards and queries as images or PDFs. Configure instance settings, authentication (LDAP, SAML, OIDC), themes, and integrations with external action hubs.

## Tools

### Create Embed URL

Generate a signed SSO embed URL for embedding Looker content (dashboards, Looks, Explores) into external applications. The URL can be used to embed Looker in iframes with authenticated user context.

### List LookML Models

List available LookML models and their explores, or get details about a specific model or explore. Use this to discover what data models are available for querying.

### List Roles

List all available roles in the Looker instance, or get details for a specific role. Roles define permission sets and model access that can be assigned to users and groups.

### Manage Alert

Get, create, update, delete, or list data-driven alerts on dashboard tiles. Alerts trigger notifications when data meets specified conditions.

### Manage Connection

List database connections, get connection details, test connectivity, and explore database metadata (schemas, tables, columns). Use this to inspect what data sources are available and their structure.

### Manage Dashboard

Get, create, update, or delete a Looker dashboard. When getting a dashboard, also retrieves its elements and filters. For updates, only provide the fields you want to change.

### Manage Folder

Get, create, update, delete, search, or list children of a Looker folder. Folders organize Looks, dashboards, and other content into a hierarchical structure.

### Manage Group

Get, create, update, delete, or search for user groups. Groups can be used for assigning roles and managing content access. Can also add or remove users from groups.

### Manage Look

Get, create, update, or delete a Look (saved query with visualization). Can also run a Look and return its results.

### Manage Scheduled Plan

Get, create, update, delete, or list scheduled content delivery plans. Scheduled plans automate the delivery of Look or dashboard results via email, webhooks, S3, SFTP, and more.

### Manage User

Get, create, update, or delete a Looker user. Can also search for users by name or email, and manage user role assignments.

### Run Query

Run an inline query against a LookML model and retrieve results. Specify the model, explore (view), fields, filters, sorts, and limits to build a query on the fly. Results are returned in JSON format. Use this to programmatically extract data from your Looker models without needing to save a Look first.

### Run SQL Query

Execute raw SQL against a database connection using Looker's SQL Runner. Provide the connection name and SQL statement to run arbitrary queries. Results are returned in JSON format.

### Search Dashboards

Search for dashboards by title, description, or folder. Returns a list of matching dashboards with their metadata. Use this to discover dashboards or find specific ones.

### Search Looks

Search for saved Looks by title, description, or folder. Returns a list of matching Looks with their metadata.

### Validate Content

Validate LookML content in a project. Checks for errors in models, views, and explores. Also can validate LookML in a specific project for syntax and reference errors.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
