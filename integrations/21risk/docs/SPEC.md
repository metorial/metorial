# Slates Specification for 21risk

## Overview

21RISK is a web application for working with checklists, audits, and corrective actions, used for compliance and risk management. Typical use cases include fire protection checklists, asset protection programs, ISO compliance, and EHS compliance. It also provides COPE (Construction, Occupancy, Protection, and Exposure) data models for property insurance risk assessment.

## Authentication

21RISK uses **API Key** authentication.

Users can generate an API key by visiting `https://app.21risk.com/profile/account` and creating a new API key from their account settings.

The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your_api_key>
```

The API base URL is `https://www.21risk.com/odata/v5/`. The API follows the OData protocol.

## Features

### Organizations

- Retrieve information about organizations (tenants) in the account.

### Sites Management

- Access site data including locations, custom columns, and site responsibilities.
- Sites represent locations such as production facilities or warehouses where audits and compliance activities take place.

### Audits and Reports

- Retrieve audit/report data, including checklist responses and compliance status.
- Audits can be daily, weekly, or one-time, including self-inspections triggered via QR codes or by invited third-party experts.

### Risk Models and Categories

- Access risk model definitions and their associated categories/questions.
- Risk models define the structure of compliance checklists, with categories containing various question types (checkbox, select, number, slider, comment, currency, signature, location, etc.).

### Corrective Actions

- Retrieve corrective actions (also called "actions") that track non-compliance issues.
- Actions are automatically created when a risk-model category is non-compliant in an audit.
- Actions include details such as responsible person, cost estimates, due dates, and status.

### Compliance Data

- Retrieve compliance status data across audits and sites.

### Property Insurance Items

- Access property/insurance-related items, including value collection and risk improvement data.
- Retrieve items-per-month analytics.

### COPE Data

- Access COPE (Construction, Occupancy, Protection, and Exposure) data for insurance risk assessment.

### Analytics and Data Export

- The API uses the OData protocol, which supports standard query options such as `$filter`, `$select`, `$expand`, `$orderby`, and `$top` for flexible data retrieval.
- Data can be integrated with external analytics tools, particularly Microsoft Power BI.

### Users/Members

- Retrieve user (member) information for the organization.

### Limitations

- The OData API is primarily **read-only** and designed for data extraction and analytics use cases.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms through its API.

21RISK offers polling-based triggers through Zapier, which can detect new actions (corrective actions), new users (members), and new audits. These are implemented via polling rather than webhooks.
