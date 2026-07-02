Now let me get the full list of APIs from their documentation:Now I have enough information to write the specification.

# Slates Specification for CommCare

## Overview

CommCare is an open-source mobile data collection and case management platform built by Dimagi, primarily used by frontline workers in health, agriculture, and social services. The platform enables users to build and configure content and a user interface, deploy applications to Android devices or a web interface for data entry, and receive that data back in real time. CommCare's information structure is comprised of cases and forms — forms are collected in a single interaction and cases allow things to be tracked over time.

## Authentication

CommCare supports several authentication methods for API access:

### API Key Authentication (Recommended)

The APIs support a few different methods of authentication in addition to the normal session-based authentication used on the rest of CommCare HQ.

- API keys are generated from the CommCare HQ account settings page at `https://www.commcarehq.org/a/[domain]/settings/`.
- When creating a new API key, the actual key will only be shown once so you should note it down at that moment.
- The API key is passed via an `Authorization` header in the format: `Authorization: ApiKey [USERNAME]:[API_KEY]` where `USERNAME` is the email address of the web user.
- API keys can be restricted by IP address allowlist and/or scoped to a specific domain/project space. If either of these fields are left blank, the API Key will by default be unrestricted.
- If you use this method of authentication, you do not need to provide a 2-factor OTP header.

### Basic Authentication

Standard HTTP Basic Authentication using the web user's email and password. If the account has two-factor authentication enabled, you must use API Key authentication or pass in a two-factor token generated via SMS or your authenticator application via the `otp` URL parameter.

### Important Notes

- All API URLs follow the pattern: `https://www.commcarehq.org/a/[domain]/api/[version]/[resource]/` where `[domain]` is the project space name.
- In addition to the permissions listed for each API, all APIs also require the "API Access" permission.
- API access is only available to CommCare users with a Standard Plan or above.
- The current API version is **v0.5**.

## Features

### Case Management

Retrieve, create, update, and close cases — the core longitudinal data records in CommCare. Cases track ongoing interactions with objects (often people) through form submissions. Each case has a type (e.g., "patient", "household") and cases may be structured in hierarchies using relationships between cases.

- Cases can be filtered by type, owner, date modified, and custom case properties.
- The v2 Case API introduces JSON-based case creation and modification (individually and in bulk), and allows filtering by project-specific case properties.
- The bulk API allows creating or modifying up to 100 cases in a single request.
- Supports upsert operations using external IDs.

### Form Data Access

Retrieve submitted form data including all question responses and metadata.

- Forms can be filtered by xmlns (form type), date received, user, and application ID.
- Form attachments (images, audio, etc.) can be retrieved separately.
- CommCare's Submission API implements the OpenRosa standard Form Submission API for submitting XForms over HTTP/S.

### User Management

The User APIs provide endpoints for managing mobile and web users, including creation, editing, deletion, and authentication. These APIs also support group management, Single Sign-On, and user identity verification.

- List and manage mobile workers and web users within a project space.
- Manage user groups for data sharing and reporting.

### Application Structure

Retrieve either a specific application or a list of applications for a project, including their module, form, and case schemata.

- Useful for understanding the data model of a CommCare project programmatically.

### Lookup Tables (Fixtures)

Lookup tables in CommCare store reference data that can be used across multiple forms and workflows, such as health facility names, geographic locations, or standardized response options.

- Retrieve lookup table data via the Fixture API.

### SMS Messaging

SMS APIs enable sending and receiving SMS messages through CommCare, allowing integration with external systems for automated messaging, notifications, and data collection.

- Requires an SMS gateway to be configured on the project.

### FHIR Integration

Data forwarding allows CommCare cases to be sent to remote FHIR services. The FHIR Importer fetches resources from a remote FHIR API and imports them as CommCare cases. The FHIR API exposes CommCare cases as FHIR resources.

- Enabled via a feature flag; requires mapping case properties to FHIR resource paths in the Data Dictionary.

## Events

CommCare supports outbound data forwarding (webhooks) that can POST data to external URLs when certain events occur in the system.

### Form Forwarding

You can configure your project to forward any incoming forms and/or cases to a specified URL. When a form is submitted, CommCare sends the full form XML as an HTTP POST to the configured endpoint.

- Configured under **Project Settings → Data Forwarding** in CommCare HQ.
- Can be filtered to forward specific forms only.
- Includes a `received-on` header with the timestamp.

### Form Stub Forwarding

A lightweight alternative to full form forwarding. This works especially well in conjunction with the Data APIs; you can get notified of a change using Form Stub Forwarding and then use the Data APIs to look up the form and cases affected.

- Sends only the form ID, received-on timestamp, and associated case IDs.

### Case Forwarding

When cases are created, updated, or closed, the full case data is sent via HTTP POST to a configured URL.

- You may want to forward a specific case type rather than all forms. Case forwarding can be scoped by case type.
- Can optionally exclude test users from forwarding.

### Application Structure Change Forwarding

You get notified of the app ID whenever an app change is saved and the "build ID" whenever a new version is built.

- Useful for detecting when applications have been updated or rebuilt.
