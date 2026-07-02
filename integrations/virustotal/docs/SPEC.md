# Slates Specification for Virustotal

## Overview

VirusTotal is an online service (owned by Google) that analyzes files, URLs, domains, and IP addresses for malware and security threats. It aggregates antivirus scan results from multiple engines, providing users with a comprehensive assessment of potential threats, aiding in cybersecurity and threat intelligence efforts. The API exposes IoC relationships, sandbox dynamic analysis information, static information for files, YARA Livehunt & Retrohunt management, and crowdsourced detection details.

## Authentication

VirusTotal uses **API key** authentication exclusively.

- For authenticating with the API you must include the `x-apikey` header with your personal API key in all your requests.
- In order to use the API you must sign up to VirusTotal Community. Once you have a valid VirusTotal Community account you will find your personal API key in your personal settings section. This key is all you need to use the VirusTotal API.
- The base URL for all API v3 requests is `https://www.virustotal.com/api/v3/`.
- While many of the endpoints and features provided by the VirusTotal API are freely accessible to all registered users, many are restricted to premium customers only. Those endpoints and features constitute the VirusTotal Premium API.
- The VirusTotal public API must not be used in commercial products or services.

## Features

### File Scanning and Analysis

Upload a file for scanning and have it analyzed by 70+ antivirus products, 10+ dynamic analysis sandboxes, and other security tools to produce a threat score and relevant context. You can also retrieve analysis reports for files by their hash (MD5, SHA-1, SHA-256). Premium users can download submitted samples for offline study.

### URL Scanning and Analysis

Scan URLs with 70+ antivirus products/blocklists and other security tools to produce a threat score and relevant context. You can submit URLs for scanning and retrieve their analysis reports.

### Domain and IP Address Reputation

Look up reputation and contextual information for domains and IP addresses, including passive DNS data, WHOIS information, SSL certificates, and relationships such as communicating files, downloaded files, and referrer files. Users can also add votes (malicious or harmless) to domains.

### IoC Relationships

The API exposes rich relationships including embedded domains, embedded IP addresses, contacted domains, etc. This allows pivoting across indicators of compromise (files, URLs, domains, IPs) to map threat campaigns and infrastructure.

### Intelligence Search (Premium)

Search VirusTotal's entire dataset using advanced search modifiers to find files, URLs, domains, and IP addresses matching specific criteria (e.g., file type, detection count, submission country, behavioral attributes).

### Livehunt (Premium)

Livehunt allows you to hook into the stream of files submitted to VirusTotal and get notified whenever one of them matches your YARA rules. You can choose the matching entity among files, URLs, IPs, or domains. Rulesets can be created, updated, enabled/disabled, and deleted via the API. You can configure the maximum number of notifications received from a ruleset in any given 24-hour period.

### Retrohunt (Premium)

You can apply your YARA rules to the historical collection of files with Retrohunt. A Retrohunt job takes around 3-4 hours to complete and scans over 600TB of files sent to VirusTotal during the past year. Jobs can be launched and results retrieved programmatically. Retrohunt jobs can't have more than 300 YARA rules and a limit of 10 concurrent jobs per user is enforced.

### Threat Feeds / IoC Stream (Premium)

The IOC Stream is an evolution of the previous Livehunt Notifications view. It allows users to digest the incoming VirusTotal flux into relevant threat feeds that can be studied or easily exported. There are tabs for different feed types: Files, URLs, Domains, and IP Addresses. File feed batches can be retrieved by minute-level time windows.

### Graphs

Create and manage visual relationship graphs of IoCs (files, domains, URLs, IPs) to map threat campaigns and infrastructure. Graphs can be shared with other users.

### Comments and Votes

You can add comments to all indicator types (IP, Domain, File, and URL). Users can also cast votes on indicators as either malicious or harmless to contribute to community reputation scoring.

### Private Scanning (Premium)

Analyze files privately with VirusTotal. Private Scanning analyzes suspicious files without sharing them with anyone. Results are temporary and only visible to your team.

### File Download (Premium)

Premium users can download submitted samples for further research, along with the network traffic captures they generate upon execution and their detailed execution reports.

### User and Group Management (Premium)

Manage users and groups within an organization, including service accounts and quota management.

## Events

The provider does not support webhooks or purpose-built push-based event subscriptions. Livehunt notifications are retrieved via a polling-based API endpoint (`/api/v3/ioc_stream`). While Livehunt generates notifications when YARA rules match new submissions, these must be actively fetched rather than pushed to an external endpoint.
