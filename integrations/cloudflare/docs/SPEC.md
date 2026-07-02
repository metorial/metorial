# Slates Specification for Cloudflare

## Overview

Cloudflare provides internet infrastructure services including CDN, DNS, DDoS protection, security (WAF, API Shield), serverless computing (Workers), object storage (R2), video streaming, Zero Trust networking, and domain registration. Virtually anything you can do in the customer dashboard may be done via API. The latest version is Version 4, with the stable base URL `https://api.cloudflare.com/client/v4/`.

## Authentication

Cloudflare supports two authentication methods:

### API Tokens (Recommended)

Create an API token to grant access to the API to perform actions. Once you create your API token, all API requests are authorized using the RFC standard `Authorization: Bearer <API_TOKEN>` header.

There are two types of API tokens:

- **User API Tokens**: User tokens act on behalf of a particular user and inherit a subset of that user's permissions. Created from My Profile → API Tokens in the dashboard.
- **Account API Tokens**: Account API tokens allow you to set up durable integrations that can act as service principals with their own specific set of permissions. This approach is ideal for scenarios like CI/CD, or building integrations with external services. Created from Manage Account → API Tokens.

Tokens are scoped with fine-grained permissions:

- After selecting a permissions group (Account, User, or Zone), choose what level of access to grant the token. Most groups offer Edit or Read options. Edit is full CRUDL (create, read, update, delete, list) access, while Read is the read permission and list where appropriate.
- Select which resources the token is authorized to access. For example, granting Zone DNS Read access to a zone example.com will allow the token to read DNS records only for that specific zone. Any other zone will return an error for DNS record reads operations.
- API tokens allow restrictions for client IP address filtering and TTLs.

Permission scopes include: `com.cloudflare.api.user` for user permissions, `com.cloudflare.api.account` for account permissions, and `com.cloudflare.api.account.zone` for zone permissions.

### Global API Key (Legacy)

Global API key is the previous authorization scheme for interacting with the Cloudflare API. When possible, use API tokens instead of Global API key.

When using a Global API Key, requests must include two headers:

- `X-Auth-Email`: The account email address
- `X-Auth-Key`: The Global API key

API keys lack advanced limits on usage — API tokens can be limited to specific time windows and expire or be limited to use from specific IP ranges. For these reasons, Global API key is not recommended for new customers.

**Required context**: All API calls require either an Account ID or Zone ID (depending on the resource), which can be found in the Cloudflare dashboard.

## Features

### DNS Management

Create, read, update, and delete DNS records for zones. Supports all record types (A, AAAA, CNAME, MX, TXT, etc.). Allows importing/exporting zone files and managing DNS settings like DNSSEC.

### Zone Management

Add, configure, and remove domains (zones) from Cloudflare. Manage zone settings including SSL/TLS mode, caching behavior, security level, and development mode. Purge cached content for individual files or entire zones.

### Firewall & Security Rules

Configure WAF (Web Application Firewall) rules, custom firewall rules, rate limiting rules, and IP access rules. Manage security settings like Bot Management, DDoS protection overrides, and Page Shield policies.

### Workers (Serverless Computing)

Deploy and manage serverless scripts that run at Cloudflare's edge. Configure routes, bindings (KV, Durable Objects, R2), cron triggers, and environment variables. Manage Workers KV namespaces and key-value pairs.

### R2 Object Storage

Manage R2 buckets and objects via the Cloudflare API or an S3-compatible API. Configure bucket settings, CORS policies, and lifecycle rules. R2 tokens generate Access Key ID / Secret Access Key pairs for S3-compatible access.

### Load Balancing

Create and manage load balancers, origin pools, and health monitors. Configure traffic steering policies (geo, random, hash, etc.), session affinity, and failover rules.

### Pages (Deployment Platform)

The Pages API empowers you to build automations and integrate Pages with your development workflow. At a high level, the API endpoints let you manage deployments and builds and configure projects. Supports deploy hooks for headless CMS integrations.

### Cloudflare Stream (Video)

Upload, manage, and deliver video content. Configure live inputs for live streaming. Manage video access controls, captions, and watermarks.

### Analytics & Logs

Access traffic analytics, DNS analytics, and security analytics. Cloudflare provides a GraphQL Analytics API for flexible querying of analytics data. Retrieve Logpush jobs to push request logs to third-party storage.

### SSL/TLS Certificates

Manage SSL certificates including custom certificates, origin CA certificates, and certificate packs. Configure SSL/TLS encryption modes and settings per zone.

### Access & Zero Trust

Manage Cloudflare Access applications, policies, and identity providers. Configure Gateway policies, Tunnel connections, and device posture rules for Zero Trust networking.

### Alerting & Notifications

Create and manage notification policies that define what events trigger alerts and how they are delivered (email, webhooks, PagerDuty). Cloudflare offers a variety of Notifications for products and services, such as Billing, Denial of Service protection, Magic Transit, and SSL/TLS.

### Domain Registration

Register new domains, manage existing domain registrations, transfer domains, and update contact information and nameserver settings via the Registrar API.

### Account & User Management

Manage account members, roles, and invitations. Configure account-level settings and view audit logs. Manage API tokens programmatically.

## Events

Cloudflare supports webhook-based notifications through its Notifications system. Professional and higher plans can use webhooks. Webhooks are configured as destinations, and notification policies define which alert types trigger delivery to those destinations.

If you use a service that is not covered by Cloudflare's currently available webhooks, you can configure your own, and enter a valid webhook URL. Built-in webhook integrations are available for Slack, Google Chat, Discord, Microsoft Teams, PagerDuty, DataDog, OpsGenie, Splunk, and ServiceNow.

### DDoS & Security Alerts

Notifications for DDoS attacks, WAF security event spikes, and HTTP traffic anomalies (origin error spikes, unexpected traffic changes). Can be filtered by zone, service type, and sensitivity level.

### Health Check & Load Balancing Alerts

Alerts for changes to server health as determined by health checks. You can choose a trigger to fire the notification when your server becomes unhealthy, healthy, or either healthy or unhealthy. Also includes pool status change alerts (enabled/disabled) for load balancers.

### SSL/TLS Certificate Alerts

Notifications for certificate expiration, issuance events, and certificate validation status changes.

### Usage & Billing Alerts

Alerts when the usage of a product goes above a set level. You can choose the product that you want to be notified about and the threshold that fires the notification. Thresholds depend on the product chosen.

### Stream Video Alerts

Webhooks notify your service when videos successfully finish processing and are ready to stream or if your video enters an error state. Stream Live offers webhooks to notify your service when an Input connects, disconnects, or encounters an error.

### DNS & Domain Alerts

Notifications for secondary DNS zone transfer failures, DNSSEC issues, and domain registration events (expiration, transfer status).

### Cloudflare Incident Alerts

Notifications about Cloudflare platform status incidents and scheduled maintenance. Incident alerts can be filtered to incidents affecting specific components. By default, incident alerts will trigger a notification for incident updates across all impact levels and components.

### Workers Alerts

Alerts for Workers script errors, CPU usage anomalies, and observability-related events.

### Page Shield Alerts

New resource alerts notify you about new resources detected on your domain, resources detected from new host domains, or issues with the URL length of newly detected resources. Also includes alerts for malicious scripts and code change detection (Enterprise only).

### Magic Transit & Network Alerts

Alerts related to Magic Transit tunnel health, BGP hijack detection, and network interconnect maintenance events.
