Now I have enough information. Let me also check the API base URL and confirm filtering capabilities.

# Slates Specification for Mopinion

## Overview

Mopinion is a user feedback platform for collecting, analyzing, and acting on feedback across web, mobile, and email channels. It provides feedback forms, surveys, and analytics dashboards. The Mopinion Data API allows programmatic access to feedback data, reports, datasets, and deployments.

## Authentication

Mopinion uses a **public key / private key** authentication scheme with HMAC-SHA256 signing.

Credentials can be created via the Mopinion Suite at Integrations » Feedback API in the classic interface or in the Raspberry interface, provided your package includes API access.

The authentication flow works as follows:

1. **Obtain credentials**: You need a **public key** and a **private key** (also referred to as a signature token) from your Mopinion account.
2. **Get a signature token**: A signature token is retrieved from the API for a specific private_key and public_key. When instantiating, a signature token is retrieved from the API and stored using your private_key and public_key.
3. **Sign each request**: In each request, an HMAC signature will be created using SHA256-hashing, and encrypted with your signature_token. This HMAC signature is encoded together with the public_key. After this encryption, the token is set into the headers under the `X-Auth-Token` key.

**Base URL**: `https://api.mopinion.com`

**Required credentials**:

- **Public Key**: Identifies your API client.
- **Private Key**: Used together with the public key to retrieve a signature token, which is then used to generate HMAC-SHA256 signatures for each request.

API credentials can optionally be restricted to a specific report.

## Features

### Account Information

Retrieve details about your Mopinion account, including organization information and settings.

### Deployments

Manage deployments, including retrieving, adding, and deleting deployment configurations. Deployments represent the configurations that control how and where feedback forms are displayed (e.g., on websites or in mobile apps).

### Reports

Reports contain metadata such as name, description, language, creation date, and associated datasets. You can retrieve, add, update, and delete reports.

### Datasets

Datasets belong to reports and include properties like name, description, and data source. You can retrieve, add, update, and delete datasets. Datasets represent the structured collections of feedback data within a report.

### Feedback Retrieval

Retrieve feedback data from reports or datasets. Feedback can be filtered using various criteria:

- Filters include date, rating (numeric), NPS (Net Promoter Score, 0-10), CES (Customer Effort Score, 1-5), CES inverse, GCR (Goal Completion Rate with options: no, partly, yes), and tags.

### Fields

Retrieve the field definitions (questions and metadata fields) configured for a given report or dataset. This is useful for understanding the structure of collected feedback data.

## Events

Mopinion supports **outgoing webhooks** that fire when new feedback is received.

### Feedback Submission Webhooks

As soon as feedback is received the webhook will be fired. You can define which questions and specific answers the webhook should fire.

Configuration options:

- **Data source**: Select the form/data source for which the webhook should send feedback.
- **Endpoint**: Define the API endpoint where feedback should be sent. Multiple endpoints can be configured for the same webhook.
- **Webhook type**: Built-in support for Slack, Rocket.Chat, Trello, and Asana. A general JSON payload option is also available for custom integrations.
- **Parameters**: Choose the feedback fields to post (e.g., only scores and comments). The default is all parameters. You can specify parameters with an alias.
- **Conditions**: You can define which questions and specific answers should trigger the webhook. Select the question(s), the operator for the condition, and the value. Multiple AND conditions can be combined. Examples include filtering by low scores, specific feedback text, device type, browser, or URL.
- **Active/Inactive toggle**: Webhooks can be paused without deleting them.
- Two modes are available: manually sent and automatically sent webhooks, which can be used separately or together.
- Webhook security can be increased by validating the signature of incoming webhook payloads.
