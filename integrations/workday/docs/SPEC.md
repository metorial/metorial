# Slates Specification for Workday

## Overview

Workday is a cloud-based enterprise platform for human capital management (HCM), financial management, payroll, and planning. Workday has three primary types of API services: Workday Web Services (SOAP APIs) for reading and writing data, Workday REST APIs primarily for interacting with core resources and custom objects, and Report-as-a-Service (RaaS) for extracting data from custom reports. Workday also offers Workday Query Language (WQL), a SQL-like query language for higher-performing data querying.

## Authentication

Workday supports two primary authentication approaches, depending on the API type used:

### OAuth 2.0 (REST API)

REST requests use OAuth 2.0. You register an API client in Workday, grant scopes (what the client is allowed to access), and obtain access tokens (and a refresh token) to call endpoints.

**Setup steps:**

1. Search for "Register API Client for Integration" in Workday, fill out the required details including Client Name, Non-Expiring Refresh Tokens checkbox, and Scope selections for functional areas.
2. To create a non-expiring refresh token, search for "View API Client" reports, navigate to the API Clients for Integrations tab, select your client, choose "Manage Refresh Tokens for Integrations," input the authorized Workday Account, and generate a new refresh token.
3. The registration produces a **Client ID** and **Client Secret** (shown only once).

**Token endpoint:** `https://{your_workday_domain}/ccx/oauth2/token`

The token request uses `grant_type=refresh_token` with the refresh token value, authenticated via Basic Auth with Client ID and Client Secret. The returned Bearer access token is used in API requests.

**Grant types supported:** Workday supports Authorization Code Grant and Implicit Grant flows. For server-to-server integrations, the Refresh Token grant with a non-expiring refresh token is the most common approach.

**Scopes:** Scopes correspond to Workday Functional Areas. Common scopes include Staffing, Implementation, Integration, Jobs & Positions, and others depending on which APIs you need. Typical scopes for HRIS use cases include Public Data, Staffing, Recruiting, and Tenant Non-Configurable.

**Tenant-specific configuration:** The REST API endpoint format is `https://{domain}.workday.com/ccx/api/v1/{tenant}`. Both the domain (e.g., `wd2-impl-services1.workday.com`) and the tenant name are required. These values can be found in the "View API Clients" report in Workday.

### WS-Security / Basic Auth (SOAP API)

SOAP requests are authenticated with a special Workday user account (the ISU) using WS-Security headers. Access is controlled by the security group(s) and domain policies assigned to that ISU.

**Setup steps:**

1. Create an Integration System User (ISU) via the "Create Integration System User" task with a username and password.
2. Create a Security Group, assign the ISU to it, and configure Domain Security Policy Permissions for the group.
3. Activate Security Policy Changes, gather your WSDL from Public Web Services, and authenticate using the WSDL, ISU Username, and ISU Password.

Workday recommends using an Integration System User (ISU) for all integrations with third-party services.

## Features

### Human Capital Management (HCM)

You can connect applications to create, read, update, or delete information like employee records, job requisitions, time-off requests, benefits, and more. This includes managing worker profiles, personal information, employment details, organizational assignments, compensation, and benefits enrollments.

### Staffing and Recruiting

Manage the employee lifecycle including hiring, onboarding, job changes, promotions, transfers, and terminations. Create and manage job requisitions and pre-hire records. The PECI (Payroll Effective Change Interface) feature automatically sends employee updates (like new hires, promotions, or exits) from Workday to payroll providers.

### Financial Management

Organizations can leverage Workday APIs to integrate their accounting and payroll systems with Workday. This covers accounts receivable, accounts payable, general ledger, budgeting, and financial reporting.

### Time Tracking

Manage worker time blocks, time-off requests, and attendance data. The Time Tracking REST API allows reading and writing time entries for workers.

### Inbox and Business Process Management

Automate HR-related workflows such as retrieving worker details, handling inbox tasks, and managing job changes. You can approve or reject business process steps that are awaiting action in a worker's inbox.

### Report-as-a-Service (RaaS)

Reporting Services give flexible, user-defined methods to get data out of Workday. All reports developed using Workday's report writer can be set up to provide data via REST (JSON) or SOAP-based messages. This includes customer-defined calculated fields, effectively allowing clients to create their own custom APIs.

### Workday Query Language (WQL)

WQL is a SQL-like query language offering higher-performing Workday data querying capabilities. You may construct queries manually or convert existing reports to WQL. This allows flexible ad-hoc querying of Workday data across functional areas.

### Custom Objects

The REST API is primarily used for manipulating custom objects. You can create, read, update, and delete custom object records, which extend Workday's data model for organization-specific needs. Custom objects require their associated Functional Area scopes to be granted to the API client.

### Organizational Management

Manage supervisory organizations, cost centers, company hierarchies, and positions. Retrieve workers within a specific supervisory organization and manage position openings and closures.

## Events

Workday does not offer a traditional webhook subscription API that external systems can register for programmatically. However, Workday does support outbound event notifications through its integration platform:

### Outbound Messaging Services

Outbound Messaging Services are used to provide real-time notifications to external applications when business events occur within Workday. For instance, the workflow behind the "Hire" event in Workday could be configured to publish an outbound message to a subscribing third-party system. Upon receipt of the real-time notification, the subscribing system could then query Workday to get details about the event and take appropriate action.

- Configured within Workday's Business Process Framework, not via an external API call.
- You create an integration system using the Cloud Integration Template, subscribe to specific Transaction Types (e.g., "Hire - Hire Employee Event"), and provide an external notification URL.
- Supports business events such as hires, terminations, job changes, compensation changes, and other HR transactions.
- The outbound notification typically contains minimal data; the receiving system should then call back to Workday's API to retrieve full event details.
- Configuration requires Workday admin access and cannot be set up purely through the API.
