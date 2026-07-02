# Slates Specification for Azure Functions

## Overview

Azure Functions is Microsoft's serverless compute platform that allows running event-driven code without managing infrastructure. It is a "functions-as-a-service" platform, allowing you to run code in the cloud without managing servers. Functions are managed via the Azure Resource Manager (ARM) REST API under the `Microsoft.Web/sites` resource provider, which provides operations for managing function apps, their individual functions, keys, configuration, deployment slots, and more.

## Authentication

Azure Functions is managed through the Azure Resource Manager API and the Functions runtime API. There are two distinct layers of authentication:

### 1. Azure Resource Manager (Management API)

Used to manage function apps, their configuration, keys, deployment slots, and other infrastructure operations. The base URL is `https://management.azure.com`.

**OAuth 2.0 via Microsoft Entra ID (Azure AD)**

- **Authorization endpoint:** `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize`
- **Token endpoint:** `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token`
- **Scope:** `https://management.azure.com/.default`
- **Tenant ID:** Required. This is the Azure AD tenant ID for your Azure subscription.
- **Client ID & Client Secret:** Obtained by registering an application in Azure AD (App Registration).
- The resulting Bearer token is passed in the `Authorization` header.
- Functions supports built-in Azure role-based access control (Azure RBAC). Azure roles supported by Functions are Contributor, Owner, and Reader.

### 2. Functions Runtime API (Direct Invocation)

Used to invoke HTTP-triggered functions and access the runtime admin endpoints at `https://<functionappname>.azurewebsites.net`.

**API Key (Function Keys / Host Keys)**

- In the key-based authentication approach, each function has an associated key that acts as a password. The invoking entity must provide the key in the HTTP request header to successfully call the function.
- The access key can either be provided in the URL using the `?code=` query string or in the request header (`x-functions-key`).
- There are three authorization levels:
  - **Anonymous:** No key required.
  - **Function:** Requires a function-specific key or a host key.
  - **Admin:** Requires the master key (`_master`).
- To access the runtime REST APIs (under `/admin/`), you must provide the master key (`_master`) in the `x-functions-key` request header.

**Microsoft Entra ID (OAuth 2.0 / Easy Auth)**

- The App Service platform lets you use Microsoft Entra ID and several non-Microsoft identity providers to authenticate clients. Use this strategy to implement custom authorization rules for your functions.
- Configured via the Azure portal's Authentication blade on the function app. Clients must present a valid OAuth 2.0 Bearer token in the `Authorization` header.

## Features

### Function App Management

Create, update, delete, and list function apps within Azure subscriptions and resource groups. Configure hosting plans (Consumption, Premium, Dedicated), runtime version, operating system (Windows/Linux), and language stack. Manage app settings and connection strings that drive function behavior.

### Individual Function Management

List, get, create, and delete individual functions within a function app. You can programmatically access the `invoke_URL_template` by using the Azure Resource Manager APIs for List Functions or Get Function. Functions can be individually enabled or disabled.

### Function Invocation

Invoke HTTP-triggered functions directly via their URL endpoint. The HTTP trigger lets you invoke a function with an HTTP request. You can use an HTTP trigger to build serverless APIs and respond to webhooks. Supports GET, POST, and other HTTP methods as configured per function. Request parameters can be passed via query strings, route parameters, or request body.

### Access Key Management

Manage function-level keys, host-level keys, and system keys. In Azure Functions, function and host keys provide an extra layer of security to functions. Each function in an application has its specific function key. When requesting a function, include the function key in the header or as a query string parameter in the URL. This allows for the regeneration of keys for individual functions without impacting others. Keys can be listed, created, updated, and deleted through both the ARM API and the Functions runtime admin API.

### Deployment Slot Management

Azure Functions deployment slots allow your function app to run different instances called slots. Slots are different environments exposed by using a publicly available endpoint. One app instance is always mapped to the production slot, and you can swap instances assigned to a slot on demand. Slots can be created, deleted, listed, and swapped. Slot-specific app settings can be configured to remain "sticky" during swaps.

### Application Configuration

Manage application settings (environment variables), connection strings, CORS policies, authentication/authorization settings, and custom domain bindings. Azure Key Vault is a service that provides centralized secrets management, with full control over access policies and audit history. You can use a Key Vault reference in the place of a connection string or key in your application settings.

### Deployment Management

Deploy function code via ZIP deployment, external package URLs, or source control integration. When you deploy your function app to Azure, you can deploy to a separate deployment slot instead of directly to production. Deploying to a deployment slot and then swapping into production after verification is the recommended way to configure continuous deployment.

### Monitoring and Diagnostics

Retrieve function execution logs, host status, and runtime health information through the admin API. Integration with Application Insights for detailed telemetry on function executions, failures, and performance metrics.

## Events

Azure Functions itself does not natively offer webhook subscriptions or event notification mechanisms for changes to function apps or their resources. However, as an Azure resource, function app lifecycle events can be captured via **Azure Event Grid**:

### Azure Resource Manager Events (via Event Grid)

Azure Event Grid can subscribe to resource-level events on function apps through the `Microsoft.Resources` event source. These include events for resource creation, updates, and deletions occurring on the function app and its sub-resources.

- Events include: resource write success/failure, delete success/failure, and action success/failure.
- Event subscriptions specify the endpoint URL that invokes the function. When you create an event subscription from your function's Integration tab in the Azure portal, the URL is supplied for you.
- Subscriptions can be filtered by event type, subject prefix/suffix, and advanced filtering on event data fields.
- Requires configuring an Event Grid subscription on the resource group or subscription scope, targeting the `Microsoft.Web/sites` resource type.
