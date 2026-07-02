Let me fetch the full API documentation to get more details on the features.# Slates Specification for Nextdns

## Overview

NextDNS is a cloud-based DNS filtering service that blocks security threats, ads, trackers, and provides parental controls across all devices and networks. It allows users to create configuration profiles with customizable security, privacy, and content filtering rules. The API enables programmatic management of these profiles, access to DNS analytics, and real-time log streaming.

## Authentication

NextDNS uses API key authentication. Pass your API key via the `X-Api-Key` header for every request:

```
X-Api-Key: your_api_key_here
```

You can find your API key at the bottom of your account page at `https://my.nextdns.io/account`. There is one API key per account — no scopes, no OAuth, no additional credentials are required.

Note: The API is currently in beta and is subject to breaking changes without notice.

## Features

### Profile Management

Create, read, update, and delete DNS configuration profiles. You can create a new profile by POSTing to the profiles endpoint, and then GET, PATCH, and DELETE individual profiles. Each profile contains a full configuration including security settings, privacy settings, parental controls, allowlists, denylists, and performance settings.

### Security Configuration

Configure threat protection on a per-profile basis. Available security toggles include:

- Threat intelligence feeds and AI-based threat detection
- Google Safe Browsing integration
- Cryptojacking, DNS rebinding, and IDN homograph protection
- Typosquatting, DGA (Domain Generation Algorithm), and NRD (Newly Registered Domains) blocking
- DDNS, domain parking, and CSAM blocking
- Blocking specific TLDs (e.g., `.ru`, `.cn`)

### Privacy & Ad Blocking

Manage ad and tracker blocking configurations:

- Add or remove blocklists (e.g., NextDNS Recommended, OISD)
- Block native tracking for specific platforms (e.g., Huawei, Samsung)
- Enable disguised third-party tracker blocking
- Configure affiliate link handling

### Parental Controls

Control content access with parental filtering options:

- Block specific services (e.g., TikTok, Facebook) with active/inactive toggles
- Block content categories (e.g., porn, social networks) with active/inactive toggles
- Enable SafeSearch and YouTube Restricted Mode
- Block bypass methods (VPNs, proxies, etc.)

### Allow & Deny Lists

Manage custom domain-level allow and deny lists for each profile. Entries can be individually toggled active or inactive without removing them from the list.

### Profile Settings

Configure operational settings per profile:

- **Logs**: Enable/disable logging, choose retention period, select storage location (e.g., EU), optionally drop IP or domain from logs
- **Block Page**: Enable/disable a block page shown when a domain is blocked
- **Performance**: Toggle ECS (EDNS Client Subnet), cache boost, and CNAME flattening
- **Web3**: Enable/disable Web3 domain resolution

### Analytics

Access comprehensive DNS query analytics for each profile. Analytics can be filtered by date range and device. Available analytics dimensions include:

- **Status**: Query counts by status (default, blocked, allowed)
- **Domains**: Top queried domains, filterable by status
- **Reasons**: Why queries were blocked (which blocklist, native tracking, etc.)
- **IPs**: Source IP addresses with geolocation and ISP info
- **Devices**: Query counts per identified device
- **Protocols**: Query distribution by protocol (DoH, DoT, DoQ, UDP, TCP)
- **Query Types**: Distribution by DNS record type (A, AAAA, HTTPS, etc.)
- **IP Versions**: IPv4 vs IPv6 distribution
- **DNSSEC**: Validated vs non-validated query counts
- **Encryption**: Encrypted vs unencrypted query counts
- **Destinations**: Query destinations by country or by major tech company (GAFAM)

All analytics endpoints support time series mode for charting, with configurable interval, alignment, timezone, and partial window handling.

### DNS Query Logs

Access detailed per-query DNS logs for each profile. Each log entry includes timestamp, domain, protocol, client IP, device info, status, and blocking reasons. Logs can be filtered by date range, device, status, and search query. Logs can also be downloaded as a file or cleared entirely.

### Real-Time Log Streaming

Stream new logs in real-time using Server-Sent Events (SSE). Supports resuming from the last received event ID. Filtering by device, status, and search query is supported during streaming.

## Events

The provider does not support webhooks or event subscription mechanisms. NextDNS offers real-time log streaming via SSE (Server-Sent Events), which is a purpose-built streaming mechanism for consuming DNS query logs as they occur:

### DNS Query Log Stream

Stream DNS query events in real-time for a specific profile. Each event contains full query details including timestamp, domain, protocol, device, status, and blocking reasons. Supports filtering by device, status, and search query. Events include an ID that allows resuming the stream from where you left off.
