Now let me look at the actual API reference documentation in more detail.Now let me get more details on the specific API endpoints.Let me get more details on the single question endpoint and check for webhooks.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Conveyor

## Overview

Conveyor is a customer trust platform that helps companies manage security reviews by automating responses to security questionnaires and RFPs, and providing a Trust Center where customers can access security documents (like SOC 2 reports) and get AI-powered answers to security questions. Conveyor's AI Customer Trust platform automatically answers security questionnaires and RFPs and lets you share your SOC 2 and other security documents.

## Authentication

Conveyor uses API key authentication. The API token authenticates to the Conveyor API and must be included in the headers of your request.

To generate an API token:

1. Navigate to the top right dropdown, select "Preferences" and the "Organization Preferences" tab (or go to `https://app.conveyor.com/organization-preferences`). In the "Integration Configuration" section, click "Add Integration" and choose "Conveyor API".

It is recommended to create one key per integration, though multiple integrations can use the same key. If the engineer setting up the integration is not a user of Conveyor, an existing user can generate the keys and share them securely.

The API base URL is `https://api.conveyor.com/api/v2/`.

If the API key is not valid or active, the endpoint will respond with a 403 and no body.

## Features

### Analytics — Connections & Interactions

Retrieve data about connections (organizations/users who have accessed your Trust Center) and their interactions. The Analytics API provides endpoints for getting usage data out of Conveyor to put into your data warehouse or visualization tools (Splunk, Tableau, etc.). You can:

- List all connections with optional filters.
- Retrieve product lines configured in your account.
- Get knowledge base questions that visitors have asked.
- Retrieve all interactions, or filter interactions by connection ID, document ID, or question ID.

### Trust Center Portal Management

The Portal API provides endpoints for automating access to your Conveyor Trust Center. You can:

- **Authorization Requests**: List, view, and approve/deny access requests from customers seeking entry to your Trust Center. A queue view is available for pending requests.
- **Authorizations**: Create new authorizations (grant access to specific organizations) and update existing ones.
- **Folders**: Create and delete folders for organizing documents in your Trust Center.
- **Documents**: Upload new documents, update document metadata, and remove documents from the Trust Center.
- **Access Groups**: Retrieve access groups to manage which connections can see which content.

### Questionnaire Automation

Submit questionnaires to Conveyor for AI-powered answering. You can:

- List existing questionnaires.
- Upload a new questionnaire for processing.
- Create and update questionnaire requests (used for intake/triage workflows).

### AI-Powered Question Answering

Ask a single security question and receive an AI-generated answer from your knowledge library. This is useful for integrating Conveyor's answer capability into other tools or workflows.

## Events

Conveyor supports webhooks, powered by Svix.

### access.requested

Enabling webhooks allows you to automate actions such as approving access requests to Conveyor based on the presence of a user in a CRM that Conveyor does not support a native integration with.

- **Description**: Triggered when a user requests access to your Trust Center for the first time.
- **Configuration**: Webhooks are set up via the Webhook Preferences page in Conveyor (`https://app.conveyor.com/webhook-preferences`). You provide an endpoint URL and subscribe to the event. Account Owner role is required to enable webhooks.
- **Limitation**: As of the current documentation, `access.requested` is the only supported webhook event type.
