# Slates Specification for Statuscake

## Overview

StatusCake is a website monitoring platform that provides uptime monitoring, page speed monitoring, SSL certificate monitoring, and heartbeat checks. It focuses on providing observability for the applications you maintain. It supports automatic testing of website availability from 30 countries worldwide using HTTP, HEAD, TCP, DNS, SMTP, SSH, PING, and PUSH.

## Authentication

StatusCake uses API key (Bearer token) authentication. You can view and manage your API tokens from the StatusCake account panel. You can find your API Key in the StatusCake App on your Account Page. At the bottom of the page you can view, and generate a new API key.

The API token is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <API_TOKEN>
```

All API requests must be made over HTTPS.

The base URL for all API requests is `https://api.statuscake.com/v1/`.

## Features

### Uptime Monitoring

Create, read, update, and delete uptime checks that monitor website and server availability. Supports multiple check types including HTTP, HEAD, TCP, DNS, SMTP, SSH, and PING. Configurable options include check frequency (from 30 seconds to daily), monitoring regions, confirmation servers before alerting, custom headers, basic authentication, content string matching, POST body payloads, redirect following, custom status codes that trigger alerts, and timeout settings. You can also retrieve uptime check history (past test runs with status codes and performance data), uptime/downtime periods with durations, and alert history for a given check.

### Page Speed Monitoring

Create, read, update, and delete page speed checks that measure website load performance. Configurable options include check frequency, monitoring region (AU, CA, DE, FR, IN, JP, NL, SG, UK, US, USW), and alert thresholds for load time (ms), page size too large (kb), and page size too small (kb). Returns latest stats including load time, file size, and number of requests. Historical performance data with aggregated min/max/avg statistics is available.

### SSL Monitoring

Create, read, update, and delete SSL certificate checks. Monitors certificate validity, expiration, cipher strength, mixed content, and certificate status. Configurable options include check frequency, alert schedule (specify 3 day values before expiry to alert), alerts for broken certificates, upcoming expiry, mixed content issues, and alert reminders. Returns certificate scoring, cipher details, issuer information, validity dates, and mixed content resources found.

### Heartbeat Monitoring

Create, read, update, and delete heartbeat checks. Heartbeat checks work by providing a unique URL that your service must ping within a configured period (30 seconds to 48 hours). If no ping is received within the period, the check is considered down. Useful for monitoring cron jobs, background tasks, and other periodic processes.

### Contact Groups

Create, read, update, and delete contact groups that define how alerts are routed. Contact groups can include email addresses, mobile phone numbers (international format), integration IDs, and a ping URL for webhook-style notifications.

### Maintenance Windows

Create, read, update, and delete maintenance windows that suppress alerts during scheduled maintenance periods. Can target specific uptime checks by ID or by tag. Supports recurring schedules (daily, weekly, bi-weekly, monthly) with timezone configuration.

### Monitoring Locations

Retrieve available monitoring server locations for both uptime and page speed checks, including IP addresses, region information, and server status. Useful for firewall whitelisting and selecting monitoring regions.

## Events

StatusCake supports outbound webhooks for alerting on monitoring events. Webhooks are configured through **Contact Groups** — in StatusCake, you navigate to Alerting > Contact Groups, create a new contact group, and add a Webhook URL. The Webhook Method can be set to POST. The contact group is then associated with individual monitors (uptime, SSL, page speed, etc.).

### Uptime Alert Events

When an uptime check detects a status change (up or down), StatusCake sends a webhook payload to the configured URL containing the monitor name, current status, status code, URL, IP address, check rate, and contact group ID.

### SSL/Page Speed/Heartbeat Alert Events

Alerts from Uptime Monitoring, Page Speed Monitoring, SSL Monitoring, Virus Monitoring and Server Monitoring are currently supported as webhook event sources. These are triggered when the respective monitor detects an issue matching the configured alert thresholds.
