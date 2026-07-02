Let me try to fetch the actual API reference page to get more details on the available endpoints.Let me try to get the actual API reference content from the Postman documentation.Now I have a good picture of the Simplesat API. Let me also check Zapier's Simplesat page for the webhook/trigger details.

Based on my research, I can now compile the specification.

# Slates Specification for Simplesat

## Overview

Simplesat is a customer feedback management platform that enables businesses to collect, analyze, and publish CSAT (Customer Satisfaction), NPS (Net Promoter Score), and CES (Customer Effort Score) survey responses. It integrates with helpdesks and CRMs like ConnectWise, Zendesk, Autotask, Freshdesk, and Salesforce to embed surveys into ticket notification emails and sync feedback data.

## Authentication

Simplesat uses API key authentication. You need a Simplesat account with an API key to make requests.

To find your key, log into your Simplesat account and head over to **Admin** > **Account Settings**.

To authenticate, use the API key in a `X-Simplesat-Token` header.

Example:

```
X-Simplesat-Token: your_api_key_here
```

The base URL for the API is `https://api.simplesat.io/api/`.

No OAuth or other authentication methods are supported. Only a single API key mechanism is available.

## Features

### Survey Management

Retrieve information about surveys configured in your Simplesat account. Surveys can be of type CSAT, NPS, CES, or 5-star rating and support conditional follow-up questions based on sentiment, rating, or choice.

### Question Management

Access the questions associated with surveys. Questions can be of various types including multiple choice, multi-select, sliding scale, and comment box.

### Feedback Answers

Retrieve individual answers to survey questions. For the answers endpoint, you can specify a start_date and end_date for replicating data between these dates.

### Survey Responses

Access complete survey responses, which aggregate the answers a customer provided in a single survey session. Responses can also be filtered by date range.

### Customer Management

Create or update customers through the API using a single upsert endpoint. The customer's email address is used as the key. Any custom_attribute fields that didn't previously exist will be created. This is useful for syncing customer data from CRMs that don't have a native Simplesat integration.

### Event-Based Email Surveys

Event-based email surveys let you easily send a survey email from Simplesat by making an API request. This is a great way to get feedback from customers after important moments, like when they buy something or when their support issue gets fixed. The request can include customer info, ticket numbers, team member fields, and other metadata. To prevent overwhelming customers with too many surveys, Simplesat has an email suppression feature to control how often customers receive surveys.

### Team Member Lookup

Look up team members by ID to associate feedback with specific agents or employees.

## Events

Simplesat supports a "New Feedback" trigger that fires instantly when new feedback is received. This is available through Zapier's integration and functions as a webhook-based instant trigger.

### New Feedback

Triggers when a customer submits new survey feedback (rating, comment, or full response). This event can be used to forward feedback to other systems in real time, such as posting to Slack/Teams channels or updating CRM records.

- The feedback payload includes customer details, rating, comments, survey information, and associated metadata (e.g., ticket ID, team member).

Note: Simplesat does not appear to expose a native, self-service webhook configuration API. Webhook-based triggers for new feedback are available through third-party platforms (Zapier, Make, Integrately). For direct webhook URLs (e.g., for custom integrations), contacting Simplesat support may be required.
