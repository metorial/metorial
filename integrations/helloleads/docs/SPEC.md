Now let me look at the Pipedream source code for HelloLeads to get more details on the API.Based on my research, I now have enough information to write the specification. HelloLeads has a relatively simple API focused on lead management, with API key + email authentication. Let me compile the specification.

# Slates Specification for Helloleads

## Overview

HelloLeads is a sales CRM and simple lead management software which helps sales professionals to capture, track and manage leads efficiently. HelloLeads CRM is a SaaS Solution, Cloud based and Mobile enabled, and runs on Android, iOS and Web platforms. It is primarily targeted at small and medium-sized businesses.

## Authentication

HelloLeads uses API keys for authentication. Requests are authenticated using two custom HTTP headers:

- **`hls-key`**: Set to `token=YOUR_API_KEY`, where `YOUR_API_KEY` is your HelloLeads API key.
- **`Xemail`**: Set to the email address associated with your HelloLeads account.
- **`Content-Type`**: Set to `application/json`.

HelloLeads CRM provides APIs and website integration scripts; the details of the API and the script for web form integration are available in Settings in the HelloLeads CRM web application.

The base URL for API requests is `https://app.helloleads.io/index.php/private/api/`.

Example request headers:

```
hls-key: token=abc123yourtoken
Xemail: user@example.com
Content-Type: application/json
```

Only users with the role of Account owner will have access to Integration.

## Features

### Lead Management

Retrieve and create leads in the HelloLeads system. You can streamline contact syncing, lead tracking, and perform actions based on lead status changes. Leads contain contact and address information, qualifiers, follow-up information, notes, and activities. Lead data includes contact and address information (Email ID, Mobile Number, Direct Number, office number, Website, Address, City, State, Zip), as well as lead qualifiers such as Potential, customer group, Products group, Lead stage, Deal size, tags, notes and activities.

- Leads can be created with fields including name, title, organization, email, phone numbers, address, and custom qualifiers.
- Custom fields can be created in HelloLeads based on your requirements.
- Leads can be added to a specific list.

### Lead Lists

Lists are logical collections of leads/prospects. Using lists in HelloLeads, you may categorize your leads in a useful way. Lists can be used to arrange leads by source, geography, or timelines.

- Lists support auto-assignment of leads to team members via round-robin or specific user assignment.
- Each list can have its own greeting email template and SMS template.

### Lead Export

Leads or customers information can be exported into an Excel or CSV from HelloLeads CRM. The export functionality is available for the users who are 'account owners' in the application.

### Reports and Insights

You can get reports or actionable insights on the leads across qualifiers such as Lead stage, Potential, Customer group and Product group. This helps sales team members to understand their leads and customers better. Reports are also available to evaluate team member's performance, monitoring their activities and outcome.

### Web Form Integration

HelloLeads CRM provides APIs and website integration scripts that can be used in your enquiry form to integrate it with your HelloLeads CRM account. The details of the API and the script for web form integration is available in settings in the HelloLeads CRM web application.

- Leads submitted through website forms can be automatically created in HelloLeads.

**Note:** HelloLeads has a relatively limited public API surface. The primary API capabilities are retrieving leads and creating new leads. The API documentation is not publicly published in detail and is available within the HelloLeads web application settings.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms. Third-party platforms like Pipedream implement polling-based triggers that emit new events when a new lead is created, but this is not a native webhook or event system provided by HelloLeads itself.
