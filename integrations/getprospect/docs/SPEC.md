Let me get more details from the official API docs and the Make.com documentation.Now let me check the Zapier triggers to understand what webhook events GetProspect supports:Now I have enough information to compile the specification.

# Slates Specification for Getprospect

## Overview

GetProspect is a B2B lead generation platform that provides email finding and verification services from a database of over 200 million business contacts. It offers a built-in CRM for managing leads, companies, and outreach sequences, along with a LinkedIn extension for extracting prospect data.

## Authentication

GetProspect uses API key authentication.

**Obtaining the API Key:**

1. Click the Settings icon in the top right corner of your GetProspect account.
2. Navigate to the **Integrations** section.
3. Copy the API key displayed on the screen.

**Using the API Key:**
Include the API key in the `apiKey` header of every request. The base URL for the API is `https://api.getprospect.com/public/v1/`.

Example:

```
GET https://api.getprospect.com/public/v1/email/verify?email=example@company.com
Headers:
  apiKey: your_api_key_here
```

No OAuth or additional scopes are required.

## Features

### Lead Management

Create, retrieve, update, and delete leads (contacts) in your GetProspect account. Lead records include fields such as email, first name, last name, company name, company URL, job title, phone, LinkedIn URL, Twitter handle, and notes. Leads can be filtered, sorted, and searched.

### Company Management

Create, retrieve, update, and delete company records. Companies can be associated with leads and managed independently.

### Email Finder

Find a prospect's most likely business email address given a domain name, first name, and last name. Each successful lookup consumes account credits.

### Email Verification

Verify the deliverability of a given email address. Useful for cleaning and validating contact lists before outreach.

### Sequence Management

Create and manage email outreach sequences, including creating, updating, and deleting sequences. Sequences contain steps that can also be individually managed (create, update, delete).

### Tags

Create, update, and delete tags for organizing and categorizing leads and other records.

### Notes

Create, retrieve, update, and delete notes that can be attached to leads or other records.

### Domain Management

Create, retrieve, update, and delete domain records used in email finding and prospecting.

### Job Titles

Create, update, and delete job title records, which can be associated with tags for categorization.

## Events

GetProspect supports webhooks that can be configured via the API. When configuring a webhook, you specify a `webhook_url`, a description, custom request headers, and the events to subscribe to.

### New Contact Saved

Triggers when a new contact is saved via a LinkedIn plugin, bulk import, database search, or programmatic creation. Does not trigger when a lead is added manually. Fires after the email contact search has completed.

### Corporate Email Found

Triggers when a verified corporate email address is successfully found for a new contact. Does not trigger for manually added leads.

### Valid Email Found

Triggers when any valid email address is successfully found for a new contact. Does not trigger for manually added leads.
