Let me fetch the Swagger spec for more detail on the API features.# Slates Specification for IBM X-Force Exchange

## Overview

IBM X-Force Exchange is a cloud-based threat intelligence sharing platform that allows users to research security threats, aggregate actionable intelligence, and collaborate with peers. The API allows automated consumption of threat intelligence, providing access to IP and URL category feeds, IP and URL reports, vulnerability feeds, and TAXII feeds. The platform offers tiered subscriptions (Essentials, Standard, Premium) with varying levels of access to threat data and reports.

## Authentication

IBM X-Force Exchange uses **HTTP Basic Authentication** with an API Key and Password pair.

- **Method:** HTTP Basic Auth (`Authorization: Basic base64(apikey:password)`)
- **Base URL:** `https://api.xforce.ibmcloud.com`
- **Credentials:** An API Key (used as the username) and a Password (used as the password)
- **TLS requirement:** Only HTTPS connections supporting TLS 1.2 or newer are accepted.

**Generating credentials:**

1. After purchasing a premium subscription, log in to X-Force Exchange at `https://exchange.xforce.ibmcloud.com/`.
2. Click the Settings link, then click the API Access link to view the API details page at `https://exchange.xforce.ibmcloud.com/settings/api`.
3. Click the Generate button to create a new API Key and Password.

**Important notes:**

- API keys and passwords do not expire.
- The password is only shown at generation time — save it immediately.
- If forgotten, generate a new API key/password pair.
- Do not share your API key; it is specific to your user ID.

**Example usage:**

```
curl -u {apikey}:{password} https://api.xforce.ibmcloud.com/url/cnn.com
```

## Features

### IP Reputation Lookup

Retrieve risk scores, geolocation, content categorization, and reputation history for IP addresses and subnets. Query malware associated with a specific IP, list IPs by threat category (Spam, Malware, Bots, Scanning IPs, etc.), and look up networks assigned to an Autonomous System Number (ASN).

- Supports IPv4 and IPv6 in various formats.
- Categories include: Spam, Anonymisation Services, Scanning IPs, Dynamic IPs, Malware, Bots, Botnet Command and Control Server, Cryptocurrency Mining.
- A Delta API provides bulk base content downloads followed by incremental updates (every 15 minutes) per category.

### URL Reputation Lookup

Retrieve URL risk ratings, content categories, malware information, and categorization history for URLs. Query malware associated with a URL and list URLs by threat category.

- Returns content category classifications (e.g., Malware, Phishing, Shopping, Social Networking, etc.).
- Includes a Delta API for incremental category-based URL updates.
- Can retrieve associated URLs and related application profiles.

### Malware Intelligence

Look up malware details by file hash (MD5, SHA1, SHA256), malware family name, or wildcard search on family names. Returns information about malware origins (CnC servers, download servers, email campaigns), risk level, family classification, and external detection coverage.

### Vulnerability Database

Search and retrieve vulnerability details from the X-Force vulnerability database. Look up vulnerabilities by X-Force Database ID (XFID), standard codes (CVE, BID, US-CERT VU#, RHSA), Microsoft Security Bulletin ID, or full-text search. Includes CVSS scoring, affected platforms, remediation guidance, and references.

- Supports bulk lookup of up to 200 vulnerabilities at once.
- Can retrieve recently reported or recently updated vulnerabilities with date range filtering.

### DNS & WHOIS

Retrieve live and passive DNS records for IP addresses, domains, or URLs. Perform WHOIS lookups to get registration information including creation date, expiration date, registrant contacts, and registrar details.

### Collections (Case Files)

Create, manage, and share threat intelligence collections (case files). Collections serve as collaborative workspaces for aggregating indicators of compromise (IPs, URLs, malware hashes, vulnerabilities) and contextual notes.

- Collections can be private, shared with specific groups, or public.
- Supports file attachments, linked collections, and report imports.
- Full-text search across public and private collections.
- Exportable in STIX format.
- TLP (Traffic Light Protocol) color markings for information sharing classification.

### Internet Application Profiles

Look up risk profiles for internet applications (e.g., Facebook, Instagram). Returns application description, content categories, supported actions, risk factors (insecure communication, upload capability, malware presence), and associated URLs.

### Signatures (IDS/IPS)

Search and retrieve IDS/IPS signature definitions. Look up signatures by PAM ID, PAM name, or full-text search. View signatures by XPU (content update package) release and see which vulnerabilities a signature protects against.

### Protection Feeds (Standard Tier)

Access curated, regularly updated feeds of threat indicators categorized by type. Categories include botnet C&C servers, bots, phishing URLs, anonymization services, cryptocurrency mining, scanning IPs, malware, early warning, and benign indicators. Available as IPv4, IPv6, and URL lists.

- Feeds are also available via STIX/TAXII 1.1 and TAXII 2.0/2.1 for automated ingestion.
- Output formats: JSON, plain text, or CSV.

### Early Warning Feed

Access a feed of newly detected suspicious domains before they are fully classified. Filterable by date range. Restricted to paid users.

### Premier Threat Intelligence Reports (Premium Tier)

Access in-depth, analyst-curated reports including:

- **Threat Analysis Reports:** Detailed analysis of emerging and existing threats.
- **OSINT Advisory Reports:** Open-source intelligence advisories.
- **Malware Analysis Reports:** Deep-dive analysis of how malware functions, including indicators of compromise, payloads, and processes.
- **Industry Profiles:** Industry-specific threat landscape overviews (e.g., Retail, Transportation, Telecommunications).
- **Threat Group Profiles:** Profiles of cyber threat groups tracked by IBM X-Force (e.g., ITG01, ITG14).

Reports can be filtered by type and date range. A limited set of sample reports is available to free-tier users.

### STIX Export

Export threat intelligence objects (IPs, URLs, malware, botnets, threat groups, industry profiles) in STIX 2.0 or 2.1 format for integration with compatible security tools. Includes full botnet report exports with associated C&C server details.

### TAXII Services

Exchange threat intelligence via TAXII 1.1 and TAXII 2.0/2.1 protocols. Access collections including IP reputation by category, URL categorization, vulnerabilities, botnets, public/private/shared collections, early warning data, and premium threat intelligence content. Supports both polling (read) and inbox (write to writable collections) operations.

### Tags & Search

Search across collections and reports using tags. Tags connect collections and reports with relevant keywords and allow cross-referencing related threat intelligence content.

### API Usage Tracking

Monitor API consumption with usage details per month for each subscription type, including entitlement limits and current usage counts.

## Events

The provider does not support events. IBM X-Force Exchange does not offer webhooks or purpose-built event subscription mechanisms. It does provide RSS feeds for newly published threat intelligence reports (threat analysis, malware, OSINT advisories), but these are standard RSS and not a webhook or dedicated polling mechanism.
