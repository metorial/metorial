# Slates Specification for Updown.io

## Overview

Updown.io is a website monitoring service that periodically sends HTTP requests to user-specified URLs and alerts when sites are unresponsive, return errors, or have SSL certificate issues. It checks your website's status by periodically sending an HTTP request and notifies you by Slack, Telegram, email or SMS when your website is not responding correctly, your SSL certificate is invalid or about to expire. It supports monitoring via HTTPS, HTTP, ICMP, TCP, and pulse checks from multiple global locations.

## Authentication

The API is a simple HTTPS API returning JSON. All API calls require authentication with an API key, which can be provided in one of two ways:

- **Query parameter**: Append `?api-key=YOUR_API_KEY` to the request URL.
- **HTTP header**: Include the header `X-API-KEY: YOUR_API_KEY`.

The API key can be found on the user's settings page after signing in at `https://updown.io`.

Updown.io also offers a read-only API key so you can build public integrations (like a truly custom status page or TV dashboard) directly in javascript without giving away your read/write access. The read-only key only works with GET endpoints.

**Base URL**: `https://updown.io/api`

## Features

### Uptime Check Management

Create, update, list, and delete monitoring checks for websites and services. Supported check types include `https`, `http`, `icmp`, `tcp`, `tcps`, and `pulse` (for heartbeat-style monitoring without a URL).

- **Check frequency**: Configurable from 15 seconds to 1 hour for regular checks; up to 1 month for pulse checks.
- **APDEX threshold**: Configurable performance threshold (0.125s to 8.0s).
- **HTTP configuration**: Choose the HTTP verb (GET/HEAD, POST, PUT, PATCH, DELETE, OPTIONS), set custom headers, and include an HTTP body.
- **String matching**: Optionally verify that a specific string is present in the response body.
- **Monitoring locations**: Selectively disable specific monitoring locations (e.g., `lan`, `mia`, `fra`, `tok`, `syd`, etc.).
- **Muting**: Temporarily mute alerts until a specified time, until recovery, or forever.
- **Publishing**: Optionally make a check's status publicly visible.

### Downtime History

Retrieve the full downtime history for any check, including error details, start and end times, duration, and whether the downtime was partial (e.g., IPv6-only). Optionally include detailed request-level results for the last 5 requests before downtime and recovery.

### Performance Metrics

Retrieve aggregated performance metrics for a check over a specified time range, including uptime percentage, APDEX score, request counts (satisfied, tolerated, failures), and detailed timing breakdowns (DNS lookup, connection, TLS handshake, response time). Metrics can be grouped by time or by monitoring location (host).

- Metrics are aggregated hourly, then by day after 2 days, and by month after 40 days.

### Alert Recipients Management

List, add, and delete alert recipients (notification channels) for your account. Supported recipient types that can be created via the API include email, SMS, webhook, Slack-compatible, and Microsoft Teams. Other integrations (Slack, Telegram, Zapier, Statuspage) require setup via the web UI.

Recipients can be assigned to individual checks to control which channels receive alerts for each check.

### Status Pages

Create, update, list, and delete public or private status pages that aggregate multiple checks into a single view. Status pages can be configured with:

- A name and description.
- Visibility: `public`, `protected` (requires an access key), or `private`.
- A curated, ordered list of checks to display.

### Monitoring Node Information

List all updown.io monitoring server locations with their IP addresses (IPv4 and IPv6), geographic coordinates, and city/country information. IP lists are also available via DNS records at `ips.updown.io` for automated firewall whitelisting.

## Events

The Push API (webhooks) allows you to receive updates in real time when your checks go up or down. Webhooks are configured either through the settings page in the web UI or via the recipients API. Updown.io will send a POST request to all configured endpoints every time an event occurs. Events are always delivered as a JSON array.

### Check Down

Fired when a monitored check goes down (after confirmation from multiple locations). Includes full check details and downtime information with error reason.

### Check Up

Fired when a check recovers after being down. Includes the check details and the completed downtime record with duration.

### SSL Certificate Invalid

Fired when the SSL certificate served by the monitored site is considered invalid. Includes certificate details and the specific error encountered.

### SSL Certificate Valid

Fired when a previously invalid SSL certificate becomes valid again (recovery event).

### SSL Certificate Expiration

Fired when an SSL certificate is approaching its expiration date. Alerts are sent at 30, 14, 7, and 1 day(s) before expiration (for 1-year certificates). Includes the number of days remaining before expiration.

### SSL Certificate Renewed

Fired when an SSL certificate that was approaching expiration has been renewed. Includes both the old and new certificate details.

### Performance Drop

Fired when the APDEX score drops more than 30% below the lowest value of the previous 5 hours. Includes the percentage drop and recent hourly APDEX metrics.
