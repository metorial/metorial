# Slates Specification for Textit

## Overview

TextIt is a cloud-based platform for building and managing interactive messaging workflows (flows) across SMS, voice, WhatsApp, Facebook Messenger, Telegram, and other channels. It provides a way of automating conversational interactions over SMS, messaging bots and phone calls. The core of the platform is a feature called "Flows," which allows you to map out entire conversations—from sending initial messages to asking questions, processing replies, and triggering different actions.

## Authentication

TextIt uses API token authentication. You must authenticate all calls by including an `Authorization` header with your API token. The Authorization header should look like `Authorization: Token YOUR_API_TOKEN`. For security reasons, all calls must be made using HTTPS.

To obtain your API token:

- Log in to your TextIt account
- Your API Token can be found at the top right of the API documentation page (`https://textit.com/api/v2/`)

The base URL for all API calls is `https://textit.com/api/v2/`.

## Features

### Contact Management

Create, update, delete, and list contacts in your workspace. Contacts are identified by URNs (Uniform Resource Names) such as phone numbers (`tel:+250788123123`), Twitter handles (`twitter:jack`), or email addresses (`mailto:jack@example.com`). Contacts can be organized into groups, and custom contact fields can be defined to store additional data. Bulk contact actions (e.g., adding/removing from groups, blocking, archiving) are supported.

### Messaging

Send and list messages across configured channels. Broadcasts allow sending a message to multiple contacts, groups, or URNs at once. Messages can include media attachments uploaded through the media endpoint. Message labels can be created and applied to organize incoming messages, and bulk message actions are available (e.g., labeling, archiving).

### Flow Management

List available flows and their metadata. Start contacts in specific flows via flow starts, optionally passing extra variables for use during flow execution. A run is a single pass through a flow by a contact; you can list and filter all the runs on your account and retrieve the steps and values collected by each contact who passed through the flow. Flow text fields support translations using ISO-639-3 language codes.

### Campaigns

Create and manage campaigns that automate scheduled actions for contact groups. Campaign events define when and what action occurs (e.g., starting a flow at a specific offset from a date field on a contact). Campaign events can be created, updated, and deleted.

### Channels

List the messaging channels configured on your workspace (e.g., Twilio numbers, WhatsApp, Telegram bots). Channels represent the connection to external messaging services through which messages are sent and received.

### Tickets and Topics

List and manage support tickets for contacts. Tickets can be organized by topics, which can be created and listed. Bulk ticket actions (e.g., assigning, closing) are supported.

### Classifiers

List natural language processing classifiers connected to the workspace (e.g., Wit.ai). These classifiers can be used within flows to interpret message intent.

### Workspace and Users

View workspace information including organization details. List user logins associated with the workspace.

### Archives

Access historical archives of messages and flow runs for data export and analysis purposes.

### Globals

List global variables defined in the workspace, which can be referenced across multiple flows.

## Events

TextIt supports real-time event notifications through **Resthooks**, a subscription-based webhook pattern. By making a POST request with the event you want to subscribe to and the target URL, you can subscribe to be notified whenever your resthook event is triggered.

### Flow-triggered Events

Resthooks are defined within flows using a "Call Resthook" action. When a contact reaches that point in a flow, all subscribers to that resthook slug are notified via POST to their target URL. The event data includes information about the flow, the contact (UUID, name, URN), the channel, the run, the input (URN, text, attachments), and the path taken through the flow.

- **Configuration**: Resthooks are identified by a slug (e.g., `new-report`, `new-birth`). Subscribers register a target URL for a specific resthook slug.
- **Consideration**: Resthook slugs must first be created within a flow in the TextIt UI before subscribers can be added via the API. The events are entirely user-defined based on where the resthook action is placed in a flow.
