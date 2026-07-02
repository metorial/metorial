Let me get more details from the documentation page.# Slates Specification for Tpscheck

## Overview

TPSCheck.uk is an API that allows businesses to verify phone numbers against the UK's Telephone Preference Service (TPS) and Corporate Telephone Preference Service (CTPS) registers. It provides real-time verification and insights on validity, location, type, and provider of phone numbers. TPSCheck is an independent commercial service operated by Visian Systems Limited.

## Authentication

TPSCheck uses API keys for authentication. Every API request must include the API key in the `Authorization` header using the `Token` prefix:

```
Authorization: Token YOUR_API_KEY
```

To obtain an API key:

1. Create a free account at `https://www.tpscheck.uk/signup/` (no credit card required).
2. Retrieve your API key from your profile page at `https://www.tpscheck.uk/profile/`.

All requests must be made over HTTPS to the base URL: `https://api.tpscheck.uk/`

If authentication fails, the API returns a `401 Unauthorized` response.

Note: For Enterprise customers, SSO is also available via SAML 2.0, OAuth 2.0, and OpenID Connect with compatible identity providers (Azure AD, Okta, Google Workspace, etc.) for dashboard access, but API authentication is always via API key.

## Features

### TPS/CTPS Number Verification

Check any UK phone number against TPS and CTPS registers instantly. Submit a single phone number and receive its registration status on both TPS and CTPS. The API supports two response format versions — v1 (legacy) and v2 (enriched with line details, reachability, and risk scoring). Use the `version=2` query parameter to opt into the enriched format.

### Phone Intelligence

Every lookup returns registration status, line type, carrier, location, and reachability in a single API call. Data points include line type (mobile, landline, VoIP, etc.), original carrier, geographic location (landlines only), and country. This is included at no extra cost with every check.

### Bulk/Batch Checking

Support for bulk requests and real-time verification ensure you have all the tools you need. The batch endpoint accepts up to 100 phone numbers per request. Each number in the batch returns the same data as a single check. Available on Advanced and Unlimited plans only.

### Compliance Risk Scoring

Risk scoring provides an overall score from 0 to 100 for each phone number, considering factors like TPS/CTPS registration, days since last check, number validity, community spam reports, and line type. Risk levels range from LOW (0–25) to CRITICAL (76–100). Available on Business and Enterprise plans only, and only returned in v2 response format.

### 28-Day Re-check Automation

Automatically monitors registered phone numbers and re-checks them against TPS/CTPS registers before the ICO-recommended 28-day compliance window expires. ICO guidance recommends screening at least every 28 days. Numbers are re-checked on day 25 with a 3-day safety buffer. Available on Growth, Business, and Enterprise plans.

### Audit Logs & Compliance Reports

They log the numbers you check to provide audit trails and compliance reports. Logs include the phone number, TPS/CTPS result, timestamp, user/API key, and result details. Exportable in CSV and PDF formats. Audit logs are retained for 12 to 24 months on Pro plans and above.

### Credit Management

Check current API usage, remaining credits, monthly limits, plan name, and reset date via the credits endpoint. Your dashboard will warn you at 80% and 95% usage.

### White-Label

Enterprise customers can offer TPS checking under their own brand, with custom API domains, branded responses, custom documentation portals, reseller dashboards, and branded reports.

## Events

TPSCheck supports webhook notifications on Pro, Business, and Enterprise plans. Webhooks are configured via the TPSCheck dashboard, where you select which events to receive and provide your endpoint URL.

### Bulk Job Completed

Notifies when a batch processing job has finished and results are ready for retrieval.

### TPS Status Changed

Alerts when a monitored number has been newly registered (or removed) on TPS or CTPS. Useful for automatically updating CRM records or exclusion lists.

### Credits Running Low

Triggers when remaining credits drop below a configured threshold, enabling automatic top-ups or alerts to administrators.

### Usage Limit Approaching

Fires when monthly usage is nearing the plan limit.

### Subscription Changes

Notifies of plan upgrades, downgrades, or billing updates.
