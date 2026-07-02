# Slates Specification for SAP SuccessFactors

## Overview

SAP SuccessFactors is a cloud-based Human Capital Management (HCM) suite that covers the full employee lifecycle. It provides comprehensive solutions for core HR, talent management, employee experience, and analytics, with API support for deep integration with all aspects of the employee lifecycle and organizational management. Key modules include Employee Central, Recruiting, Onboarding/Offboarding, Performance & Goals, Succession & Development, Learning, and Compensation.

## Authentication

HTTP Basic Authentication is deprecated. SAP recommends using OAuth 2.0 authentication, specifically the OAuth 2.0 SAML Bearer Assertion flow, where a signed SAML assertion is exchanged for an OAuth access token.

### OAuth 2.0 SAML Bearer Assertion Flow

This is a multi-step process:

**Prerequisites / Required Credentials:**

1. **API Server URL**: The base URL of your SAP SuccessFactors OData API instance. **Company ID**: Your company's unique identifier. **API Key**: Generated during the OAuth client application registration process.
2. **X.509 Certificate and Private Key**: A key pair used for signing SAML assertions. The certificate corresponds to the private and public key used in the OAuth 2.0 authentication process. SAP SuccessFactors requires the public key, and the client application keeps the private key.

**Registration Steps:**

1. Go to Admin Center → API Center → OAuth Configuration for OData and choose Register Client Application.
2. Provide an application name, application URL, and the X.509 public certificate. You can obtain a certificate from a service provider, generate a self-signed certificate, or generate one directly in SAP SuccessFactors.
3. After registration, an API key is generated and assigned to your application.

**Token Exchange Flow:**

1. Generate a SAML assertion signed with your private key. This can be done using a corporate IdP (e.g., SAP Identity Authentication Service), a third-party IdP, or an offline SAML generation tool.
2. Pass your SAML assertion and API key (in the `client_id` field) along with other information to generate an OAuth token by making a POST request to `https://<api-server>/oauth/token` with:
   - `grant_type`: `urn:ietf:params:oauth:grant-type:saml2-bearer`
   - `company_id`: Your company ID
   - `client_id`: Your API key
   - `assertion`: The Base64-encoded SAML assertion
3. The response returns an access token with a Bearer token type, typically valid for 86,399 seconds (approximately 24 hours).
4. Use the access token as a `Bearer` token in the `Authorization` header for all subsequent API calls.

**API Server URLs** vary by data center region, following the format `https://api<dc>.successfactors.com` (e.g., `apisalesdemo4.successfactors.com`). The specific server depends on your instance's data center.

## Features

### Employee Central (Core HR)

Access and manage a wide range of employee data, including personal information, employment details, compensation, and benefits. This includes organizational structures, job information, pay components, and employee master data. Supports creating, reading, updating, and deleting (CRUD) records.

- Supports effective-dated entities for historical tracking of changes.
- Includes organizational management (departments, divisions, cost centers, positions).

### Recruiting

Manage the full recruitment lifecycle including job requisitions, job postings, candidates, and applications. Interviews can be updated, rescheduled, or cancelled with automated notifications. Configurable search criteria can be defined for external vs. internal candidates.

- Includes offer management and approval workflows.
- Supports external recruiting agency access.

### Onboarding / Offboarding

Manage new hire onboarding and employee offboarding processes. Integrates tightly with recruiting and employee central to automate the hire-to-start experience.

### Performance & Goals

Establishes clear objectives for employees and ensures objective performance assessment. The module covers goal development and management, personal development plans, performance assessments, and training.

- Supports 360-degree assessments where both employees and supervisors provide feedback.
- Includes calibration features for fair review processes.

### Succession & Development

Manage succession planning, talent pools, and career development paths. Identify key positions and potential successors within the organization.

### Learning Management

Consolidates training information including completed courses, pending training, and due dates. Training can be offered as self-paced online courses. Employees can search for offerings, enroll, and obtain certificates.

- Note: Learning Management System (LMS) entities may use separate API endpoints from the core OData APIs.

### Compensation

The Compensation module manages the salary review process and long-term incentives such as stock awards. The Variable Pay module manages short-term incentives such as performance-based bonus programs.

### Time & Attendance

Manage employee time tracking, time-off requests, leave balances, and absence management.

### Workforce Analytics & Reporting

Access workforce planning data and HR analytics for reporting and insights.

### Metadata & Configuration

All MDF (Metadata Framework) entities are automatically exposed through the OData APIs. Users can access, create, upsert, and delete MDF entities. Admin users can also create and manage MDF Object Definitions and picklists.

- The API uses OData v2 as the primary protocol, with OData v4 available for newer modules.
- The legacy SFAPI is deprecated. Customers should use OData for new development.

## Events

SAP SuccessFactors has webhook functionality implemented through a feature called Intelligent Services rather than a dedicated webhook API.

To set up webhooks, you need to configure an Intelligent Services event in the SuccessFactors Integration Center. You can subscribe to certain events and send data to external systems when those events occur. The types of events you can subscribe to are limited to what's provided in the standard Intelligent Services — custom webhook events are not possible.

The webhook integration sends employee data to external systems when events occur. There is no direct API to programmatically create webhook subscriptions — they need to be configured through the SuccessFactors UI.

### Employee Lifecycle Events

Events triggered by changes to employee status and core HR data:

- **Employee Hire**: Triggered when a new employee is created in the system.
- **Employee Termination**: Triggered when an employee is terminated.
- **Job Transfer / Job Change**: Triggered when an employee's job information changes (e.g., department, position, location).
- **Change in Manager**: Triggered when an employee's reporting line changes.
- **Change in Employee Location**: Triggered when an employee's work location is updated.

### Talent & Performance Events

Events related to talent management processes:

- **Update on a Job Requisition**: Triggered when an approved or closed job requisition is updated.
- **Offer Approved**: Triggered after the final approval step on an offer detail.
- **Job Application Update**: Triggered when a job application is updated and the applicant is in an applied state.
- **Creation of an Activity in Continuous Performance Management**: Triggered when CPM activities are created.

### Time & Absence Events

- **Employee Time Off**: Triggered when time-off or absence requests are submitted or changed.

### Configuration

When configuring an Intelligent Services integration in the Integration Center:

- Select "Intelligent Services" as the trigger type, "REST" as the destination type, "SuccessFactors" as the source type, and "JSON" as the format type.
- The payload fields can be customized by mapping entity fields from the SuccessFactors data model.
- Integrations are then linked to events via the Intelligent Services Center (ISC), where you subscribe an integration to a specific event.
- Business rules can be applied to filter or condition when events are published.
