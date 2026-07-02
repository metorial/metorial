# <img src="https://provider-logos.metorial-cdn.com/azure-functions.png" height="20"> Azure Functions

Manage and invoke Azure Functions serverless compute resources. Create, update, delete, and list function apps and their individual functions. Invoke HTTP-triggered functions directly via URL endpoints. Manage function-level, host-level, and system access keys for authentication. Configure application settings, connection strings, CORS policies, and custom domain bindings. Create, swap, and manage deployment slots for staged rollouts. Deploy function code via ZIP packages, external URLs, or source control integration. Retrieve function execution logs, host status, and runtime health. Monitor resource lifecycle events via Azure Event Grid integration.

## Tools

### Get Function App

Get detailed information about a specific Azure Function App, including its configuration, state, hosting details, and site settings. Also retrieves the app's configuration (runtime stack, platform, etc.) and application settings.

### Get Function

Get detailed information about a specific function within a function app, including its invocation URL, language, configuration, and associated files. Optionally retrieves the function's access keys.

### Invoke Function

Invoke an HTTP-triggered Azure Function directly. Sends an HTTP request to the function's runtime endpoint with the specified method, body, query parameters, and headers. Requires a function key or host key for non-anonymous functions.

### List Deployments

List deployment history for an Azure Function App. Returns information about each deployment including author, status, timestamps, and whether it is the currently active deployment.

### List Function Apps

List all Azure Function Apps in the configured resource group. Returns a summary of each function app including its name, location, state, and hostname. Useful for discovering available function apps before performing further operations.

### List Functions

List all individual functions within a specific Azure Function App. Returns each function's name, invoke URL, language, and enabled/disabled status.

### Manage App Settings

List or update application settings (environment variables) for an Azure Function App. When updating, you can add new settings, modify existing ones, or remove settings by setting their value to null. Existing settings not included in the update payload are preserved.

### Manage Function App

Perform lifecycle operations on an Azure Function App. Supports starting, stopping, restarting, and deleting function apps. Use this to control the running state of your function apps.

### Manage Access Keys

Manage function-level and host-level access keys for Azure Function Apps. Supports listing, creating, updating, and deleting keys. Function keys control access to individual functions, while host keys control access to all functions in the app.

### Manage Deployment Slots

Manage deployment slots for an Azure Function App. Supports listing, creating, deleting, and swapping slots. Deployment slots let you run different versions of your function app and swap them into production seamlessly.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
