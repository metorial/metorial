Now I have enough information to write the specification. Based on my research, Control D does not appear to support webhooks or any event subscription mechanism through its API.

# Slates Specification for Control D

## Overview

Control D is a customizable DNS filtering and traffic redirection platform. It can do all the things a standard DNS resolver can (resolve domains to IP addresses), but also allows blocking, redirecting, and spoofing DNS responses based on configurable rules. Control D is part of Windscribe, a security and privacy company based in Toronto, Ontario.

## Authentication

Control D uses **Bearer token (API key)** authentication.

Control D uses API keys for authentication. API tokens are generated from the Control D dashboard under the API section.

- **Base URL:** `https://api.controld.com`
- **Header:** `Authorization: Bearer <API_TOKEN>`
- Tokens can be created with a type of **Read** (view-only access) or **Write** (view and modify data). Optionally, **Allowed IPs** can be set to restrict where the token can be used from.
- Token scope and network restrictions can be updated at any time.

For **organization accounts** managing sub-organizations, you can "impersonate" an admin of a child sub-organization by supplying the `X-Force-Org-Id: org_id_goes_here` HTTP header along with API calls. This allows you to view, create, and modify resources within the target sub-organization using the parent organization's API token.

Example request:

```
GET https://api.controld.com/users
Authorization: Bearer YOUR_API_TOKEN
Accept: application/json
```

## Features

### Profile Management

A Profile is a collection of rules and settings enforced on a DNS resolver, also known as a policy or configuration. Profiles include Filters (categories to block), Services (specific websites/apps to block or redirect), Custom Rules (domain-level rules), and Profile Options (customizable behaviors).

- Create, list, modify, and delete profiles.
- Profiles can be chained to reduce duplication and form complex behaviors.
- Configure profile options such as TTL settings, DNS rebind protection, and DNSSEC.

### Filter Management

Control D offers various pre-configured filters such as Ads & Trackers, Adult Content, Artificial Intelligence, Clickbait, Crypto, Dating, Drugs, and more. Both native and third-party filter lists are available. Filters can be toggled on or off per profile.

### Service-Level Blocking and Redirection

Filtering can be scoped to specific services like Facebook, TikTok, or Steam — there are 400+ to choose from. Each service can be set to block, allow, or redirect through proxy locations. Services are organized into categories.

### Custom Rules

Granular control over individual domain names is available, including blocking specific websites, whole TLDs, and wildcard rules. Rules are organized into folders. Each rule can block, allow, spoof (to a custom IP), or redirect traffic through a proxy location.

### Device (Endpoint) Management

Endpoints are unique DNS resolvers that enforce Profiles. These should be mapped 1:1 with physical devices, which can be used by one or more people.

- Create, list, modify, and delete devices.
- Assign profiles to devices, including scheduled profile swapping.
- Filter devices by type (user devices vs. routers).

### Access Control (IP Authorization)

Manage the list of authorized IPs that can use your DNS resolvers. You can list known IPs, register new IPs, and remove learned IPs. This is useful for Legacy DNS enforcement where IP-based identification is required.

### Traffic Redirection via Proxies

You can redirect traffic to one of over 100 exit proxy locations supported by Control D, which will transparently proxy traffic through servers in that location/country, masking the client IP. Available proxy locations can be listed via the API.

### Organization and Sub-Organization Management

Profiles and Endpoints can be grouped into organizational units called "Sub-Organizations" representing physical sites, departments, or customer companies. Access can be delegated to team members to manage assets within each sub-organization.

- View organization info and members.
- Create and modify sub-organizations.

### Analytics Configuration

Configure DNS query logging levels and storage regions for analytics data. Log levels control what gets recorded, and storage regions determine where analytics data is kept.

### Account and Billing

- Retrieve user account data.
- View payment history, active subscriptions, and product information.
- Get network stats and current IP information.

## Events

The provider does not support events. The API currently has no versioning, and things can change at any time. There is no webhook, callback, or event subscription mechanism available in the Control D API.
