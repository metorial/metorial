# <img src="https://provider-logos.metorial-cdn.com/heroku.svg" height="20"> Heroku

Deploy, manage, and scale applications on Heroku's cloud platform. Create and configure apps, scale dynos, provision add-ons (databases, caching, etc.), manage configuration variables, build and release code, add custom domains and SSL certificates, manage collaborators and team permissions, configure pipelines for continuous delivery, set up log drains, and sync data with Salesforce via Heroku Connect. Subscribe to webhooks for real-time notifications on app changes, builds, releases, dyno lifecycle events, and more.

## Tools

### Create App

Create a new Heroku application. Optionally specify a name, region, and stack. If no name is provided, Heroku generates one automatically.

### Delete App

Permanently delete a Heroku application. This action is irreversible and removes all associated resources including add-ons, dynos, and config vars.

### Get Account

Retrieve the authenticated user's Heroku account details including email, verification status, and two-factor authentication status.

### Get App

Retrieve detailed information about a specific Heroku app by its name or ID. Returns full app configuration including region, stack, URLs, maintenance status, and ownership.

### List Apps

List all Heroku applications accessible to the authenticated user. Returns app names, regions, stacks, URLs, and ownership details.

### Manage Add-ons

List, provision, update, or remove add-on services for a Heroku app. Use **action** to specify the operation: - \

### Manage Builds

List, get, or create builds for a Heroku app. Builds compile source code into slugs that can be deployed as releases. Use this for non-interactive CI/CD workflows.

### Manage Collaborators

List, add, or remove collaborators who have access to a Heroku app. Collaborators can deploy and manage the app based on their permissions.

### Manage Config Vars

Read or update environment configuration variables for a Heroku app. Config vars are used to store credentials, API keys, database URLs, and other environment-specific settings. Requires **read-protected** or **write-protected** OAuth scopes.

### Manage Domains

List, add, or remove custom domains for a Heroku app. Custom domains allow users to access apps via their own domain names instead of the default \

### Manage Dynos

List running dynos, run one-off dynos, or restart dynos for a Heroku app. Use **action** to specify the operation: - \

### Manage Log Drains

List, add, or remove log drains for a Heroku app. Log drains forward application logs to external services like Papertrail, Datadog, or custom syslog endpoints.

### Manage Pipelines

Manage Heroku Pipelines for continuous delivery workflows. List, create, update, or delete pipelines, and manage pipeline couplings that link apps to pipeline stages (development, staging, production).

### Manage Releases

List releases, get release details, or rollback to a previous release for a Heroku app. Releases track each deployment and config change, allowing you to roll back if needed.

### Scale Formation

View or scale dyno formations for a Heroku app. List current formation to see process types, quantities, and sizes, or scale by updating quantity and size per process type.

### Update App

Update a Heroku application's settings. Can rename the app, toggle maintenance mode, or change the build stack.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
