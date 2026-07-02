Now let me fetch the full Make.com documentation for more details on the API actions:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for La Growth Machine

## Overview

La Growth Machine (LGM) is a multichannel sales outreach automation platform that manages prospecting campaigns across LinkedIn, email, and Twitter/X. It automates multi-channel prospecting by managing LinkedIn, email, and Twitter outreach campaigns, with built-in lead enrichment, audience management, and a unified inbox for managing replies across all channels.

## Authentication

All API requests to La Growth Machine must be authenticated using an API key.

**Base URL:** `https://apiv2.lagrowthmachine.com/flow` — this is the main endpoint for all API requests.

**Obtaining an API Key:**
You can retrieve your API key from your account settings: `https://app.lagrowthmachine.com/settings/api`. You must be logged in to access this page.

**How to Authenticate:**
Include your API key in the query parameters of your request under the key `apikey`.

Example: `GET https://apiv2.lagrowthmachine.com/flow/members?apikey=YOUR_API_KEY`

**Note:** API access and many key integrations are only available on higher-tier plans (Pro plan at ~€100/month or above).

## Features

### Lead Management

Search, create, and update leads in La Growth Machine. The Search Lead action allows you to search a lead in La Growth Machine from an email, LinkedIn URL, or lead ID. You can also search by full name, company name, or company domain. When creating or updating leads, ensure you are mapping fields like first name, last name, and email correctly. By default, only empty fields will be updated; if you want to update fields that already have data, go to Outreach Settings and turn on "Update the existing contact with changed or new fields".

### Audience Management

Organize leads into audiences (segmented lists). You can import leads into La Growth Machine audiences from LinkedIn URLs. Leads can also be removed from one or more specified audiences. To add leads to an audience, the audience must already exist and must be created directly within La Growth Machine.

### Campaign Management

Retrieve campaign information and manage lead statuses within campaigns. You can retrieve all campaigns from your account. You can change the LGM status of a specific lead in a specific campaign (e.g., pause, stop, or update their qualification status). LGM's API gives you access to raw campaign stats, including performance metrics for reporting.

### LinkedIn Messaging

Send LinkedIn messages to leads directly through the API. You can target a lead by their ID or LinkedIn profile URL.

### LinkedIn Lead Import

Import leads from LinkedIn by extracting contact information from regular LinkedIn search results, Sales Navigator search URLs, or specific LinkedIn post URLs.

### Workspace & Identity Management

List all connected identities in your account. List all members (users) associated with your workspace.

### Inbox Webhooks

Create inbox webhooks for real-time notifications. List all inbox webhooks currently configured in your workspace.

## Events

La Growth Machine supports webhook-based event subscriptions. You can use a Webhook block directly in your prospecting sequences to communicate with your own tools, and choose when to send the trigger (e.g., lead enriched, email sent, lead responded, etc.). Webhooks can be created under "Settings > Webhooks" in the LGM interface. The platform also exposes events via its Zapier/Make integrations.

### Email Events

- **Email Sent** — Triggers when an email is sent to a lead.
- **Email Opened** — Triggers when a lead opened one of your emails.
- **Email Clicked** — Triggers when a lead clicked on a link in one of your emails. Click tracking must be enabled.
- **Email Replied** — Triggers when a lead replied to one of your emails.

### LinkedIn Events

- **LinkedIn Contact Request Sent** — Triggers when a LinkedIn contact request is sent to a lead.
- **LinkedIn Contact Request Accepted** — Triggers when a lead accepted your identity's connection request on LinkedIn.
- **LinkedIn Message Sent** — Triggers when a LinkedIn message is sent to a lead.
- **LinkedIn Message Replied** — Triggers when a lead replied to one of your LinkedIn messages or an invite note.
- **LinkedIn Profile Visited** — Triggers when a lead's LinkedIn profile is visited.

### Twitter/X Events

- **Tweet Sent** — Triggers when a tweet is sent.
- **Twitter DM Sent** — Triggers when a Twitter DM is sent to a lead.
- **Tweet Favorited** — Triggers when a lead's tweet is favorited.
- **Tweet Retweeted** — Triggers when a lead's tweet is retweeted.
- **Twitter Followed** — Triggers when a lead is followed on Twitter.
- **Twitter Unfollowed** — Triggers when a lead is unfollowed on Twitter.

### Lead Lifecycle Events

- **Lead Enriched** — Triggers when a Lead is enriched by LGM.
- **Lead Converted** — Triggers when a lead is marked as converted.
- **Lead Resubscribed** — Triggers when a Lead is resubscribed.
- **Lead Unsubscribed** — Triggers when a Lead is unsubscribed.
- **New Lead in Audience** — Triggers when a new lead is added to a specific audience or moved into a different audience.
- **Lead Status Changed** — Triggers when the status of a lead within a specific campaign is updated.

### Campaign Events

- **Campaign Ended** — Triggers when the lead finishes a campaign sequence.
