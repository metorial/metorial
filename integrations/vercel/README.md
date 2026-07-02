# <img src="https://provider-logos.metorial-cdn.com/vercel-logo.png" height="20"> Vercel

Manage web application deployments, projects, and infrastructure on Vercel's cloud platform. Create and configure projects with build settings, framework presets, and Git repository connections. Deploy applications programmatically, promote deployments to production, and manage rolling releases. Register, transfer, and configure domains with DNS records and SSL certificates. Create and manage environment variables scoped to production, preview, or development environments. Manage team members, roles, and access groups for fine-grained RBAC. Configure Edge Config stores for ultra-low-latency key-value data at the edge. Set up log drains to forward logs to external services. Register deployment checks for custom validation before promotion. Create deploy hooks to trigger builds from external systems. Upload and manage files with Vercel Blob storage. Configure Web Application Firewall rules, rate limiting, and IP blocking. Schedule cron jobs and retrieve billing and usage information. Receive webhooks for deployment lifecycle, domain changes, project events, rolling releases, and marketplace billing activity.

## Tools

### Cancel Deployment

Cancel an in-progress deployment that is currently building. Cannot cancel deployments that have already completed.

### Create Deployment

Trigger a new deployment for a Vercel project. Deploy from a Git source, redeploy an existing deployment, or deploy files directly. Specify the target environment (production, preview, or custom).

### Create Project

Create a new Vercel project. Optionally configure build settings, framework, Git repository connection, and environment variables at creation time.

### Delete Project

Permanently delete a Vercel project and all its deployments. This action cannot be undone.

### Get Deployment

Retrieve detailed information about a specific deployment by its ID or URL. Returns build status, alias assignments, Git metadata, and more.

### Get Project

Retrieve detailed information about a Vercel project by its ID or name. Returns project settings, build configuration, framework, environment details, and associated domains.

### List Deployments

List deployments for the authenticated user or team. Filter by project, target environment, or state. Returns deployment status, URL, and metadata.

### List Projects

List Vercel projects for the authenticated user or team. Supports searching by name and pagination.

### Manage DNS Records

List, create, update, or delete DNS records for a domain managed in Vercel. Supports A, AAAA, CNAME, MX, TXT, SRV, CAA, and other record types.

### Manage Domains

List, add, or remove domains from your Vercel account or a specific project. Also supports verifying project domains and retrieving domain configuration.

### Manage Edge Config

Create, list, and manage Vercel Edge Config stores and their items. Edge Config provides ultra-low-latency key-value reads at the edge, useful for feature flags, A/B testing, and dynamic configuration.

### Manage Environment Variables

List, create, update, or delete environment variables for a Vercel project. Variables can be scoped to production, preview, and/or development environments. Supports encrypted and plain text values.

### Manage Teams

List teams, get team details, and manage team members. View team information, list members, invite new members, or remove existing ones.

### Promote Deployment

Promote a deployment to production by pointing all production domains to it. Useful for rollbacks or manual production promotions.

### Update Project

Update settings for an existing Vercel project. Modify build configuration, framework, Node.js version, protection settings, and other project-level options.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
