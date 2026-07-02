# Slates Specification for Pingdom

## Overview

Pingdom (by SolarWinds) is a website monitoring service that tracks uptime, downtime, and performance of websites, applications, and servers. It offers uptime monitoring, transaction monitoring (synthetic user workflows), real user monitoring (RUM), and page speed analysis, with alerting when issues are detected.

## Authentication

Pingdom API 3.1 uses Bearer Authentication (token auth), allowing you to authenticate with an API key instead of your product credentials.

**Method:** Bearer Token (API Token)

- **Base URL:** `https://api.pingdom.com/api/3.1`
- **Header:** `Authorization: Bearer <API_TOKEN>`

**Generating a token:**

1. Log in to My Pingdom and go to Integrations → The Pingdom API in the left menu.
2. In the Pingdom API page, click Add API token. In the Add API token pop-up window, specify a unique name for your API token and select the desired Access Level. Click Generate token.
3. Save the token somewhere as you will not be able to access it again.

**Access Levels:**

Tokens can be created with one of two access levels:

- **Read access** — allows read-only operations
- **Read-Write access** — allows both read and write operations

**Token behavior:**

- The API token that you generate in Pingdom does not expire.
- You must be logged in as an Account Owner, Editor, or Admin user to obtain the API key.

**Multi-account support:**

If you're on Pingdom's enterprise plan that allows for subaccount delegation, you'll need to know the email of the owner account as well.

**Example request:**

```
curl -X GET https://api.pingdom.com/api/3.1/checks \
  -H 'Authorization: Bearer YOUR_API_TOKEN'
```

## Features

### Uptime Check Management

Create, list, update, and delete uptime checks that monitor the availability of websites, servers, and services. Given a domain (and an optional path), a random Pingdom server from around the world will attempt to access your site. Supported check types include HTTP, HTTPS, TCP, UDP, PING, DNS, SMTP, POP3, and IMAP. Checks can be configured with custom intervals, tags, and alert thresholds.

### Transaction Check Management (TMS)

Transaction monitoring (TMS) continuously tests a series of steps in a common workflow important to your business—critical transactions like shopping carts, logins, registration forms, etc. The API supports managing TMS checks (CRUD), allowing you to automate the process of creating, deleting, or updating transaction checks.

### Check Results & Performance Data

Retrieve detailed results for individual checks, including response times, status codes, and probe server information. You can query results for specific time periods and filter by check status.

### Summary Reports

Access aggregated performance summaries for checks, including:

- **Average response time and uptime** for a given time period.
- Performance data for a given interval in time, returned as sub-intervals with a given resolution. Useful for generating graphs. A sub interval may be a week, a day or an hour depending on the chosen resolution.
- Status change history for a specified check and time period.

### Alerting & Contacts Management

Returns a list of actions (alerts) that have been generated for your account. You can also manage alerting contacts, teams, and alert policies through the API. List, create, update and delete users. List, create, update and delete teams.

### Maintenance Windows

List, create, update and delete maintenance windows. Maintenance windows allow you to schedule planned downtime so that checks are paused and alerts are suppressed during those periods.

### Root Cause Analysis

Returns a list of the latest root cause analysis results for a specified check. This helps diagnose why a check failed.

### Single (Ad-hoc) Checks

Perform a one-time probe check against a host without creating a persistent check. This is useful for quick availability tests.

### Probe Server Information

Returns a list of all Pingdom probe servers for Uptime and Transaction checks. Useful for understanding where checks originate from globally.

### Account Information

Returns information about remaining checks, SMS credits and SMS auto-refill status.

## Events

Pingdom supports webhooks that notify external systems when monitoring checks change state.

### State Change Webhooks

Pingdom's state change webhooks let you programmatically act on state changes that occur on your uptime or transaction checks. For uptime checks, a state change is when the check changes state from UP to DOWN or vice versa. For transaction checks, a state change is when the check changes state from SUCCESS to FAILING or vice versa.

- Webhooks are configured per-check by creating a Webhook integration in Pingdom (Settings → Integrations → Add Integration → Webhook) and then enabling it on individual checks.
- The POST body contains a JSON data object with information specific to the check type that triggered the webhook. The payload includes the check ID, check name, check type, previous state, current state, timestamp, description, tags, and probe server details.
- Every HTTP request will only contain info about one state change.

### BeepManager Alert Webhooks

State change webhooks should not be confused with BeepManager webhooks. State change webhooks trigger immediately when an uptime or transaction check changes state, as opposed to a BeepManager webhook that triggers only if you use BeepManager as your alerting system and BeepManager is set up to alert a user or alerting endpoint that is configured to trigger a webhook.

- BeepManager webhooks are perfect when you want to create an integration with Pingdom that logs the resolution time of triggered incidents.
- For BeepManager alerts, alert bundling (alert flood protection) is supported. This means that data is grouped if multiple incidents are triggered simultaneously.
