Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Uptimerobot

## Overview

UptimeRobot is a website monitoring service that tracks the uptime, downtime, and response times of websites, servers, and other internet services. It supports multiple monitor types (HTTP, keyword, ping, port, heartbeat, DNS) and provides public status pages, maintenance windows, alert contacts, and integrations with third-party services.

## Authentication

UptimeRobot supports two authentication methods depending on the API version:

### API Key Authentication (v2)

The API key is passed as a parameter (`api_key`) in the request body. There are three types of API keys:

- **Account-specific API key:** Allows using all the API methods on all the monitors of an account.
- **Monitor-specific API keys:** Allows using only the `getMonitors` method for the given monitor, useful for pulling data for a single monitor without revealing the main API key.
- **Read-only API key:** Allows fetching data with all read-only API endpoints.

### Bearer Token / JWT Authentication (v3)

v3 supports bearer tokens (JWT) passed in the `Authorization` header, replacing the need to send API keys in request bodies.

### How to obtain API keys

Log in to the UptimeRobot dashboard and navigate to **Integrations & API** in the left sidebar. Choose **API** and create your main API keys or monitor-specific API keys.

Base URL: `https://api.uptimerobot.com/v2/` (legacy) or the v3 REST endpoints.

## Features

### Monitor Management

Create, retrieve, update, and delete monitors that check the availability and performance of your services. v3 supports standard REST operations on monitors (list, create, update, delete) using resource-oriented paths. Supported monitor types include:

- **HTTP/HTTPS monitors:** Check website or endpoint availability via HTTP requests.
- **Keyword monitors:** Check whether a specific keyword exists or is absent on a web page.
- **Ping monitors:** Monitor server availability using ICMP ping.
- **Port monitors:** Check if a specific port is open on a server.
- **Heartbeat monitors:** Confirm that scheduled jobs or services are alive by expecting periodic pings from your application.
- **DNS monitors:** Track DNS records and domain expiry dates.

Monitors can be configured with custom timeouts, expected HTTP status codes, custom HTTP headers, SSL and domain expiry reminders, and tags.

### Alert Contact Management

Manage alert contacts that receive notifications when monitors change state (up/down). Alert contacts are whom to be notified when the monitor goes up/down. Contacts can be configured with threshold and recurrence settings to control how many minutes to wait before alerting and how often to repeat.

### Integration Management

The v3 API provides RESTful endpoints for managing integrations (`/integrations`). Programmatically set up notification integrations for services such as Slack, Microsoft Teams, Google Chat, Discord, Telegram, Pushover, Pushbullet, PagerDuty, Splunk, Mattermost, Zapier, and Webhooks.

### Public Status Pages

Create and manage public-facing status pages that display the uptime status of your monitors. The v3 API supports Public Status Pages via `/psps` endpoints. Status pages can be customized with light/dark themes, density settings, and incident history display options.

### Maintenance Windows

Create, edit, and delete maintenance windows to define scheduled downtime periods during which alerts are suppressed. Maintenance windows support explicit start/end times, recurrence rules, and assignment to specific monitors.

### Account Information

Retrieve the authenticated user's profile, subscription details, monitor limits, and list alert contacts directly via dedicated user endpoints.

## Events

UptimeRobot supports outbound webhooks for real-time event notifications.

### Webhook Alert Contacts

You can configure which monitor events (up, down, SSL, domain) fire off a webhook notification. Webhooks are set up as alert contacts and linked to specific monitors.

- **Up/Down events:** Triggered when a monitor detects that a service has gone down or come back up.
- **SSL events:** Triggered for SSL certificate-related alerts (e.g., upcoming expiry).
- **Domain events:** Triggered for domain expiration-related alerts.

You can choose to send default alert variables as a query string appended to your webhook URL, or as POST parameters. When POST is selected, you can also customize the POST values and choose how data is sent — as a query string, or POST/JSON — to match your app's setup.

Available webhook payload variables include monitor name, monitor URL, monitor ID, alert type, alert details, and alert duration.
