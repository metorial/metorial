Now let me fetch the API docs to understand the full feature set:Now let me look at the webhook/alerting event types more specifically:Now I have enough information to write the specification.

# Slates Specification for JumpCloud

## Overview

JumpCloud is a cloud-based directory platform that provides identity and access management, device management, and SSO capabilities. It unifies user management across systems (Windows, Mac, Linux), applications (via SAML/OIDC SSO), networks (via RADIUS), and directories (via LDAP), while offering cross-platform device policy enforcement and remote command execution. The platform exposes RESTful APIs (v1 and v2) for programmatic management of its directory objects and events.

## Authentication

JumpCloud supports two primary authentication methods for its API:

### 1. Admin API Key

All endpoints support authentication via API key. The API key is passed via the `x-api-key` HTTP header on every request.

- In the Admin Portal, click your account name and select "My API Key." If you haven't generated an API key yet, you'll have the option to Generate New API Key.
- API Keys are only displayed at the time they're created. Make sure to store it securely.
- The API key has the prefix `jca_` before it.
- You can set an expiration date: 30 days, 60 days, 90 days, Custom, or No Expiration.
- API access is disabled for Admins by default. Only Admins with Billing role can enable API access.
- For multi-tenant (MSP) organizations, include the `x-org-id` header to specify the target organization.

**Example:**

```
GET https://console.jumpcloud.com/api/systemusers
x-api-key: jca_your_api_key_here
Content-Type: application/json
Accept: application/json
```

### 2. Service Account (OAuth 2.0 Client Credentials)

The Service Account uses client credentials (Client ID and Client Secret) to request an access token via an OAuth 2.0 token endpoint. This token is then used to make authenticated API calls as part of a workflow.

- The Service Account is designed for a non-human identity that is linked to the organization instead of an individual user.
- Only Administrators with Billing role are able to manage them.
- Encode Client ID and Client Secret with Base64, then use the encoded value to obtain an access token from the token endpoint. Ensure to pass the scope and grant_type values in the payload.
- Each Service Account can have up to 2 Client Secrets. In case one Client Secret is about to expire, the organization can leverage the other one.
- Service account authentication is currently not supported for all JumpCloud API endpoints.

### 3. System Context Authorization

Some systems endpoints (in both API v1 and v2) also support System Context Authorization which allows an individual system to manage its information and resource associations. This uses an RSA-SHA256 signature-based authentication specific to a system's identity and is primarily used for agent-level operations, not general API integration.

## Features

### User Management

Create, read, update, and delete user accounts in the JumpCloud directory. JumpCloud manages user accounts and a myriad of related employee data such as address, phone information, and more. Supports activating, suspending, and managing user passwords. Users can have custom attributes assigned.

### Group Management

Manage user groups and system (device) groups. User groups control access to devices, SSO applications, RADIUS networks, and directories like Google Workspace, Microsoft 365, and LDAP. Groups are the primary mechanism for binding users to resources.

### System (Device) Management

Computers or servers running Mac, Windows, and Linux can be managed through JumpCloud. Admins can provision users to devices, deploy policies to devices, and execute commands on devices.

### Graph Associations (Resource Binding)

Manage the relationships between directory objects. Any modification to the connections (associations) between resources in JumpCloud, such as users to groups, or policies to devices, are recorded under the association_change event. Allows binding users/user groups to applications, systems, RADIUS servers, LDAP directories, and more.

### Remote Commands

Define and trigger commands (scripts) to run on managed systems. Commands can be executed on demand, on schedule, or via webhook trigger. Supports Windows and Linux/Mac shell commands.

### Policy Management

The group model of managing Policies and systems allows configuring device security policies (e.g., disk encryption, password complexity, screen lock) and deploying them to device groups.

### SSO Application Management

Manage SSO application connectors (SAML 2.0 and OIDC) that allow users to authenticate into third-party web applications using their JumpCloud credentials.

### SCIM Identity Management (User Provisioning)

Identity Management Connectors manage application user accounts through the SCIM protocol. These integrations allow you to automate and centralize user and group management through the full lifecycle. After you integrate an application with JumpCloud, you can provision, update, and deprovision users.

### RADIUS Server Management

Create and manage RADIUS server configurations for WiFi and VPN authentication. Associate user groups with RADIUS servers to control network access.

### Directory Integrations

Manage integrations with external directories such as Google Workspace, Microsoft 365, Active Directory, and LDAP. Supports bi-directional user syncing.

### Directory Insights (Event Logging)

Directory Insights is JumpCloud's event logging and compliance feature. It provides audit trails leading up to critical events. You can use the RESTful API to access event logs, see activity happening in your directory, and monitor user authentications to the User Portal, SAML SSO applications, RADIUS, and LDAP.

- Event categories include: RADIUS events, Systems events (user authentications to devices, agent events, password changes, FDE), LDAP events (bind and search), MDM events, MSP events, SSO events (connector changes, user authentications), and Password Manager events.

### System Insights

Query telemetry data from managed devices (installed software, hardware details, OS configuration, browser plugins, etc.) for compliance and inventory purposes.

### Organization and Admin Management

Manage organization settings and administrator accounts, including role-based access control with roles such as Administrator, Manager, Help Desk, Command Runner, Read Only, and Billing.

## Events

JumpCloud supports webhook-based event notifications through its **Webhook Notification Channels** feature.

### How It Works

Webhooks are automated messages sent from applications when an event occurs. When a specific event happens—like a new user being created, a password reset, or a suspicious login attempt—JumpCloud can automatically send a notification to an external application or service. You can set up webhook notification channels to get alerts delivered to specified URLs.

Webhook channels are created in the Admin Portal under Settings > Notification Channels. After creating a channel, you must create an Insights Rule and add the webhook channel within the rule to generate alert notifications. Rules define which events and conditions trigger the webhook.

- JumpCloud webhooks use the POST method to send event data in JSON format to the configured URL.
- Webhook channels are reusable and can be linked to multiple alert rules or other services within the platform.
- JumpCloud retries webhook delivery three times with exponential backoff for failed deliveries.
- Custom static headers (including sensitive values like API keys) can be added for authentication with the receiving endpoint.

### Event Categories Available via Webhooks

**Directory and User Events**
Monitors critical directory events like account provisioning, permission changes, device enrollments, and password expirations. Includes events such as user creation, user updates, admin changes, association changes (user-to-group, user-to-application bindings), and privilege elevations.

**Device Monitoring Events**
Alerts for device-level conditions including battery health thresholds, storage capacity, and software additions/removals by end users.

**Agent Activity Events**
Monitor results of JumpCloud policy application, command execution, and software management. Alerts when a command fails or a policy fails to apply on a device.

**Authentication Events**
SSO authentication events, RADIUS authentication events, LDAP bind events, and system login events.

**Access Request Events**
For Access Requests, you do not need to create a separate rule to set up webhooks. Simply create a webhook channel, then navigate to Access Requests to select the specific events for which you wish to receive notifications via webhooks.

### Configuration Options

- Events can be filtered using attribute-based filter expressions (e.g., by geo-location, user agent, auth method).
- Rules support configurable priority levels (Low, Medium, High, Critical).
- Rules can apply to Devices (end-user device events) or Directory (JumpCloud Directory events).
