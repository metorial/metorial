Let me get the full list of API resources from the Breathe knowledge base article.Now let me check the API environments page for base URLs.Now I have enough information to write the specification.

# Slates Specification for Breathe HR

## Overview

Breathe HR is a cloud-based HR management platform designed for small to medium-sized businesses. It enables organizations to manage personal data, company documents, holiday requests, expenses, and sick leave. The API provides read and write access to core HR data including employees, absences, departments, and more.

## Authentication

The Breathe HR API uses API key-based authentication. Include your API key in the `X-API-KEY` header of your HTTP requests to authenticate.

**Obtaining an API Key:**

To enable your API, head to Configure > Settings > Integrations > API Setup, then click on the Enable API button to activate it. Because the API has access to sensitive information, this can only be actioned by the Admin of the account.

Two keys are provided upon enabling the API: a production key (prefixed with `prod-`) and a sandbox key (prefixed with `sandbox-`).

**Base URLs:**

- **Production:** `https://api.breathehr.com/v1`
- **Sandbox:** `https://api.sandbox.breathehr.info/v1`

**Example request:**

```
GET https://api.breathehr.com/v1/employees
X-API-KEY: prod-your-api-key-here
```

## Features

### Employee Management

Create, retrieve, and manage employee records including personal information (name, email, gender, date of birth), employment details (job title, department, division, location), and status. Supports change requests for updating employee details, where changes can optionally require approval.

### Absence & Leave Management

Retrieve absences with filtering by type, employee ID, department ID, and date range. Cancel absence requests. Manage leave requests and configure other leave reasons. List holiday allowances to track employee entitlements.

### Sickness Tracking

Retrieve sickness records with filtering by start date, end date, employee ID, and department ID. Create sickness records for employees.

### Expense Management

Create, retrieve, and delete employee expenses, including fields such as expense date, description, and amount. Manage employee expense claims with create and update operations.

### Compensation Data

Retrieve bonuses including details such as description, amount, and award date. Access salary information, including department-level salary data.

### Benefits

Retrieve employee benefits and department-level benefit information.

### Training

Retrieve company training types, each with an ID, name, and timestamps. Manage employee training course records.

### Organizational Structure

Manage departments, divisions, and locations. Retrieve department-level data including absences, benefits, bonuses, leave requests, and salaries.

### Working Patterns & Statutory Holidays

Access working pattern configurations and statutory holiday information by country.

### Custom Fields

Retrieve custom field definitions configured in the Breathe HR account.

### Account Information

Retrieve account details including the account's unique identifier, name, domain, and UUID.

## Events

The Breathe HR API does not natively support webhooks. The provider does not support events.
