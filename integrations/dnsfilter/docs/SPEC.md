Let me fetch the Swagger API documentation to get more details on the API features.Let me get the Rewst integration details page to see the full list of API actions available.Now I have a comprehensive picture. Let me also check on webhook support specifically.Now I have enough information to compile the specification.

# Slates Specification for Dnsfilter

## Overview

DNSFilter is a cloud-based DNS security service that provides AI-powered content filtering, threat protection (phishing, malware, botnets), and network visibility at the DNS layer. It serves both individual organizations and Managed Service Providers (MSPs) with multi-tenant management, roaming client agents for off-network devices, and policy-based domain filtering across 36 content categories and 400+ SaaS applications.

## Authentication

DNSFilter uses **API Key (JWT token)** authentication for its REST API.

DNSFilter users have self-service access to API JSON Web Tokens (JWT)—also called keys or tokens—through the DNSFilter dashboard.

To generate an API key:

1. Log in to the DNSFilter dashboard, navigate to your account icon, and enter a key name. The name is not editable after the key is created.
2. Copy and securely store the token immediately upon creation.

The token is passed in the `Authorization` header as a Bearer/Token value. Based on integration examples, the format is:

```
Authorization: Token <your_api_token>
```

The API base URL is `https://api.dnsfilter.com/v1/`.

Access to the REST API requires a professional subscription to DNSFilter, which is a $50 monthly minimum.

## Features

### Organization Management

Create, update, list, and delete organizations. A single console governs every customer. Baseline policies can be applied to new tenants in seconds, then adjusted per organization without touching global settings. Supports MSP hierarchies including promoting organizations to MSP status and managing MSP customer lifecycle (cancellation, deletion).

### Filtering Policy Management

Create and configure DNS filtering policies that control what content is allowed or blocked. Policies support:

- Adding/removing domains to allow lists (whitelists) and block lists (blacklists)
- Blocking or allowing entire content categories (36 available categories)
- Blocking or allowing specific applications (AppAware — 400+ SaaS apps)
- Choose from 36 categories, more than 400 SaaS apps, block risky top-level domains (TLDs), and time-based rules.

### Scheduled Policies

Create time-based filtering schedules that apply different policies during specific time windows. Scheduled policies can be created, updated, listed, and deleted.

### Network (Site) Management

Manage network sites including creating, updating, and deleting networks. Includes management of:

- IP addresses associated with networks (create, verify, update, delete)
- Network subnets
- Network LAN IPs
- Network secret keys for agent authentication

### Roaming Client (Agent) Management

List, view, update, and delete roaming client agents deployed on endpoint devices. Agents carry metadata including hostname, OS, site association, policy assignment, tags, auto-update settings, and release channel. Supports managing agent local users and agent tags.

### User Management

Manage users across organizations:

- List, create, and remove organization users
- Update user permissions (Admin, Read-Only roles)
- View user details and permissions per organization

### User Collections

Group users into collections for policy assignment. Collections support priority ordering — if a user belongs to multiple collections, the highest-priority collection's policy applies.

### Block Page Customization

Create and manage custom block pages that are displayed to end users when they attempt to access a blocked domain. Block pages can be associated with specific policies, sites, or collections.

### Domain Lookup and Categorization

Look up domains by FQDN to retrieve associated categories. Submit domains for categorization verification or threat categorization updates.

### MAC Address Management

Associate MAC addresses with organizations for device-level identification. Supports create, update, list, and delete operations.

### Traffic Reports and Analytics

Access DNS query analytics across multiple dimensions:

- Total requests and threats over time for sites, organizations, roaming clients, users, and collections
- Requests broken down by category, domain, or collection
- Queries per second (QPS) metrics
- Top requested domains, categories, organizations, networks, agents, users, and collections
- Raw query logs (limited to 72-hour time ranges)

### Billing and Invoices

View estimated invoices, list historical invoices, and manage payment methods. Billing data is integrated with Stripe.

### Data Export

The Data Export feature enables automated export of DNS query log data to SIEM platforms via HTTP Event Collector (HEC) API, supporting real-time security monitoring and compliance reporting. DNSFilter's Data Export supports Amazon S3 buckets and also Splunk. Many SIEMs are able to pull data from an S3 bucket enabling many tools to access the exported data from DNSFilter. This is a paid add-on feature configured via the dashboard, not the API.

## Events

DNSFilter supports event-driven integrations through its **Zapier integration**, which exposes the following trigger categories:

### Account Activity

Triggers when an administrator takes certain actions in the DNSFilter dashboard. This covers events such as organizations or sites being added/deleted, roaming clients or relays being added or removed from your account, and users disabling multi-factor authentication.

### Policy Block Events

Triggers when a user's DNS query is blocked by a policy. This enables alerting and ticketing workflows when users encounter blocked content or request access to content currently blocked by a DNSFilter policy.

### Dynamic Hostname Resolution Failures

Triggers when a dynamic hostname is not resolving. Useful for monitoring network health on smaller or mobile/LTE networks that use dynamic DNS.

Note: These event triggers are delivered through Zapier's infrastructure rather than a native webhook API endpoint. DNSFilter does not appear to expose a standalone webhook subscription API for arbitrary consumers.
