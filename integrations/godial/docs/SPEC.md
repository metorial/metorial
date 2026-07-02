Now let me look at the Stoplight API documentation and webhooks details:Now let me check the Stoplight API docs for more detail on available endpoints:Let me try to access the Stoplight docs directly to see the API endpoints:Now I have enough information to create the specification. Let me compile everything.

# Slates Specification for Godial

## Overview

GoDial is a mobile-first auto dialer and CRM platform designed for outbound calling operations. It provides an all-in-one calling solution with autodialer, CRM, and WhatsApp Business API integration. The API provides programmatic access to this functionality, allowing you to trigger calls, manage contacts, and automate call logging.

## Authentication

GoDial uses API key-based authentication via an access token.

For all your queries you will need an accessToken, to get this, go to Dashboard -> Integration -> External API. Every API you access has to have the `access_token=XXXXXXXXXXX` as a query parameter.

The base URL for all API requests is `https://enterprise.godial.cc/meta/api/externals/`.

Example request:

```
GET https://enterprise.godial.cc/meta/api/externals/lists/list?access_token=YOUR_ACCESS_TOKEN
```

There is no OAuth flow or additional scopes. The single access token provides full access to the account's API capabilities.

## Features

### Contact/Lead Management

Create, update, and manage contacts (leads) within GoDial. All contacts are part of a list, and for creating a new contact/lead, you need to send the contact details along with the list ID. Contacts support fields such as name, email, phone, secondary phone, company name, notes, remarks, and extra data. An `assignmentMode` parameter controls how the contact is distributed to agents.

### List Management

Retrieve and manage calling lists. You can create multiple lists and build workflows with automation and pipeline. Lists serve as the primary organizational unit for contacts and are required when adding new contacts.

### Team and Agent Management

You can create your team, agents, add lists, add contacts, etc. via the APIs. This includes managing user accounts and agent assignments within the organization.

### Account Management

Retrieve account information. The API exposes an accounts listing endpoint for querying account-level data.

## Events

GoDial supports outbound webhooks that fire when specific actions occur within the platform.

You can call your own API when a certain action happens in GoDial, for example after every call or after a contact is updated in GoDial. Webhooks are configured via Integrations -> Web Hook where you put your own URL and choose your event.

### Call Events

Triggered after a call is completed. Can be used to sync call details (disposition, duration, outcome) to external systems or trigger follow-up actions such as SMS or WhatsApp messages.

### Contact Update Events

Triggered when a contact is updated in GoDial. Can be used to keep external CRMs or databases in sync with contact changes made within GoDial.
