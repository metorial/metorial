Now let me look at the Klipfolio API docs more closely for the specific resource endpoints to understand all features:I now have enough information to write the specification.

# Slates Specification for Klipfolio

## Overview

Klipfolio is a business dashboard and analytics platform that allows users to connect to various data sources, build data visualizations (called "Klips"), and organize them into dashboards. It offers two main products: Klips (custom dashboards) and PowerMetrics (metric-focused analytics). The REST API provides programmatic access to manage clients, dashboards, data sources, visualizations, users, and roles.

## Authentication

Klipfolio uses **API Key** authentication. The Klipfolio API works with API keys to enable secure authentication. You can generate an API key from the Klipfolio app through either the My Profile page or from Users if you are an administrator.

The API key is passed as a custom HTTP header:

```
kf-api-key: <your-api-key>
```

The Klipfolio API is accessed over HTTPS from the `https://app.klipfolio.com/api/1.0/*` domain.

Example request:

```
curl https://app.klipfolio.com/api/1.0/profile \
  --header "kf-api-key: YOUR_API_KEY"
```

The permissions available to the API key correspond to the role and permissions of the user who generated it. Administrator users with the `user.manage` permission can generate API keys for other users.

## Features

### Client Management

Manage client accounts for agencies and multi-tenant setups. Create, update, and delete client accounts, configure client features and settings, manage client properties and resources, and control which company users have access to specific clients through share rights.

### Dashboard (Tab) Management

The API provides the same functionality as the web app UI for managing assets including dashboards. Create, update, and delete dashboards (referred to as "tabs" in the API). Configure dashboard layouts, manage which Klip instances appear on each dashboard, and control dashboard share rights to determine who can view or edit them.

### Klip (Visualization) Management

Create, view, update, and delete Klips — the individual data visualization components. Manage Klip schemas (the underlying data mapping and configuration), add annotations to Klips, handle client-specific Klip instances, and configure share rights for each Klip.

### Data Source Management

Create and manage data sources that feed data into Klips. Supports various connector types including REST/URL, file uploads, and pre-built service connectors. You can:

- Create data sources using different connectors (e.g., Facebook, REST/URL).
- Upload or replace data in data source instances.
- Refresh data sources on demand.
- Configure data source properties such as refresh intervals and connector settings.
- Manage data source share rights.

### User and Access Management

Manage users within your Klipfolio account, including creating, updating, and deleting users. Assign users to groups and roles, configure user properties, and manage which dashboards are assigned to specific users through user tab instances.

### Role and Permission Management

Create and manage roles with specific permission sets. Assign users to roles and configure granular permissions that control access to various features and resources within the account.

### Group Management

Organize users into groups for easier access control. Manage group membership and assign default dashboards to groups so that new group members automatically see relevant content.

### Published Links

Create and manage published links — shareable URLs for dashboards that can optionally be password-protected. This enables sharing dashboard views with external stakeholders without requiring them to have a Klipfolio account.

### Profile Management

Retrieve and update the authenticated user's profile information, including account details and API key management.

### Live Embedding (PowerMetrics)

With live embedding, you can display dynamic versions of PowerMetrics visualizations externally, for example, in a website or custom data app. Security is enabled using a Klipfolio API Key and embedded client secret. This requires creating embed clients and configuring access parameters.

## Events

The provider does not support events. Klipfolio's API does not offer webhooks or built-in event subscription mechanisms for receiving real-time notifications about changes to resources.
