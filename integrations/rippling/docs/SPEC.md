Let me fetch the webhook event details page for more information.# Slates Specification for Rippling

## Overview

Rippling is a unified workforce management platform that combines HR, IT, and Finance operations. It enables businesses to manage HR and IT — from payroll and benefits, to employee computers and software — all in one platform. The API allows developers to read and write employee, company, organizational, and payroll data programmatically.

## Authentication

Rippling supports two authentication methods:

### 1. API Tokens (Bearer Tokens)

All API requests require authorization using an API token. API tokens can be generated in the API Tokens app. These tokens use the permissions of the owner, so treat them as if you would a password. Tokens expire after 30 days of inactivity.

Tokens are passed as a Bearer token in the Authorization header:

```
Authorization: Bearer <API_TOKEN>
```

Each token is tied to a single Rippling Company.

**Base URL (REST API v2):** `https://rest.ripplingapis.com/`  
**Base URL (Platform API v1):** `https://api.rippling.com/platform/api/`

### 2. OAuth 2.0 (Authorization Code Flow)

Rippling integrations rely on OAuth 2.0, in which Rippling is the server and your application is the client. Rippling sends the user to your redirect URL with a `?code=<xxx>` parameter when they install your application. This provides the authorization that your application will use to exchange for access and refresh tokens.

- **Authorization:** User is redirected from Rippling to your configured redirect URL with an authorization `code` parameter.
- **Token Endpoint:** `https://api.rippling.com/api/o/token/`
- **Grant Types:** `authorization_code`, `refresh_token`
- **Credentials:** Requires `client_id` and `client_secret`, sent as a Base64-encoded Basic Auth header (`Base64(client_id:client_secret)`).
- The authorization code is valid for 300 seconds and must be used to redeem an access token within that time.
- The token response includes `access_token`, `refresh_token`, `expires_in`, and `scope` (e.g., `"employee:workEmail employee:name"`).
- Access tokens grant access to Rippling APIs for each company. One access token gives access to one Rippling Company. So if twelve Rippling companies have installed your app, twelve access tokens are needed.

**Scopes:** Scopes are space-delimited and follow the format `resource:field` (e.g., `employee:workEmail`, `employee:name`). As part of the initial installation flow, the Rippling company admin grants authorization and consent to the scopes configured in your app. The `openid` scope must be included to use Rippling's OIDC functionality.

Rippling also supports **OpenID Connect (OIDC)** for SSO use cases on top of OAuth 2.0, with an authorize endpoint at `https://app.rippling.com/oidc/v1/authorize`.

## Features

### Employee Management

Retrieve a list of active employees with details such as unique role ID, user ID, name, employment type, title, gender, department, work location, role state, and more. You can also retrieve both active and terminated employees. Supports filtering employees by provisioning rules and access settings configured by the company admin.

### Company Information

Retrieve the current company's details including its ID, address, work locations, primary email, phone number, and name, with nested address and work location details.

### Organizational Data

Groups represent subsets of employees across departments or teams; employees can be in multiple groups. You can create groups associated with third-party applications, specifying a name, unique spoke ID, and an array of user IDs. Teams and locations can also be retrieved.

### User Provisioning & Deprovisioning (User Management)

User Management allows customers to automate creating, updating, and deleting users in third-party software when an action is taken in Rippling. The account provisioning setting allows customers to configure rules for which employees should automatically receive access, using groupings such as "all full-time employees in the sales department" or "all employees on the product team located in New York".

### ATS Candidate Onboarding

Push a candidate from an applicant tracking system directly into the Rippling onboarding flow. The request includes candidate details such as name, email, job title, phone number, and other employment-related information.

### Leave Request Management

Approve or decline pending leave requests. The request requires the leave request ID and an action parameter (approve or decline), and returns detailed information about the leave request including employee role, status, dates, and paid leave status.

### SAML SSO Metadata

Retrieve SAML IDP metadata for app integrations that have SAML enabled. The metadata is unique per customer app installation and changes with each new installation.

### Custom Fields & Field Expansion

Field expansion allows retrieval of related data inline — instead of making multiple API calls, you can expand specific referenced fields in a single request.

## Events

Rippling supports webhooks for partner applications (App Shop integrations).

### Employee Lifecycle Events

Customer-configured account provisioning and provision time settings determine which and when employee webhook events are emitted to the webhook URL configured in the app listing. The API supports webhooks allowing real-time notifications for specific events, such as employee onboarding or offboarding.

The webhook event types include user management actions:

- `EXTERNAL_ACCOUNT_CREATE`, `EXTERNAL_ACCOUNT_INVITE`, `EXTERNAL_ACCOUNT_DELETE`, `EXTERNAL_ACCOUNT_SUSPEND`, `EXTERNAL_ACCOUNT_PASSWORD_RESET`, and others related to external account management.

These events are triggered based on the provisioning rules and timing settings configured by the Rippling company admin (e.g., on offer letter signing, on start date, or immediately upon hiring).

- Webhooks are restricted to App Shop integrations. Partner applications provide a webhook URL in their app listing to receive event-triggered notifications.
- Webhook URLs are configured at the app listing level, not programmatically per-subscription.
