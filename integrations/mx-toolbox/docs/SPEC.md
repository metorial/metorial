# Slates Specification for MXToolbox

## Overview

MXToolbox is a network diagnostic and DNS lookup platform that provides tools for checking domain health, DNS records, blacklist status, email authentication (SPF, DKIM, DMARC, BIMI, MTA-STS), and server monitoring. It is a RESTful Web Service allowing customers to query the status of their monitors and run lookups (e.g., blocklist, SMTP, MX, etc.). It provides an API to paid and free customers that allows them to perform lookups, control and poll monitors, and check API status.

## Authentication

MXToolbox uses **API key** authentication.

- MXToolbox uses API keys for authentication.
- In order to regulate usage, you are required to request an API key. The API key is associated with your account.
- To obtain your API key: Log in to your account, click your username in the top right corner to access the dropdown menu, click "Settings", then click the "API" tab in the main header section. Use the available API methods listed (e.g., Lookup, Monitor, Monitor Tags, Usage) as needed.
- The API key is passed in the `Authorization` header of each request. Example: `Authorization: {your-api-key}`
- The base URL is `https://mxtoolbox.com/api/v1/` (e.g., `https://mxtoolbox.com/api/v1/lookup/dns/{hostname}`).
- If you think your API key has been compromised, you can click "Revoke API Key" on the API settings page. Once revoked, an API key cannot be reactivated, meaning you need to generate a new one.
- A paid subscription is required to access the full power of the API. Free accounts can test using lookups against `example.com` only.

## Features

### DNS and Email Lookups

Run lookups using the same engine as the MXToolbox SuperTool. Supported lookup commands include:

- **DNS** — General DNS record lookups (A, AA, DNS, TXT, PTR, MX records).
- **Email Authentication** — SPF, DKIM (with configurable selector parameter), DMARC, BIMI, and MTA-STS lookups.
- Each lookup takes a domain name or IP address as an argument and returns categorized results (Failed, Warnings, Passed, Timeouts) with diagnostic details.
- Depending on your account tier (Free, Basic, or Pro), you may have different access to Local or Network lookups.

### Monitor Management

View the current status of all subscribed monitors and perform CRUD operations. Monitors track the health of your infrastructure including blacklist status, SMTP availability, HTTP, TCP, DNS, and mail flow performance.

- Query the real-time status of existing monitors.
- Create, update, and delete monitors programmatically.
- Quickwatch enables you to set a short-term (1 to 3 day) monitor that automatically expires. During that time if the monitor detects a change, it alerts you.

### Monitor Tag Management

Tag management and CRUD operations for tags of a given monitor. Tags allow you to organize and group monitors (similar to labels or folders) for filtering and notification management.

### API Usage Tracking

Query the number of consumed and maximum allowed API requests to monitor your API consumption against your plan limits.

## Events

MXToolbox supports **Callback Hooks** for monitor-based notifications. Customers can utilize Callback Hooks to connect to their network monitoring servers. When one of their customers is blacklisted, the monitors call their systems, where they connect it to their customer's account.

### Monitor Status Changes

Callback hooks fire when a monitored resource changes status (e.g., a server gets blacklisted, an SMTP server goes down, a DNS record changes).

- Can be configured per monitor to call an external URL when an alert condition is triggered.
- Supports blacklist alerts, server up/down notifications, DNS change detection, and mail flow issues.

**Note:** Detailed documentation on configuring callback hooks is limited in MXToolbox's public documentation. The feature is referenced in blog posts and customer examples but may require contacting MXToolbox support for setup assistance.
