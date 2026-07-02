# Slates Specification for Synthflow AI

## Overview

Synthflow AI is a voice AI platform that enables businesses to automate inbound and outbound phone calls using AI-powered agents. It provides a REST API for managing the full agent lifecycle including creation, call orchestration, telephony provisioning, knowledge bases, simulations, and analytics.

## Authentication

Synthflow uses API keys for authentication. Authentication to the Synthflow API is performed via HTTP Bearer Authentication. Provide your API Key in the Authorization request header.

All API requests require the header:

```
Authorization: Bearer <your_api_key>
```

API keys can be created and managed from **Integrations → API Keys** in the Synthflow dashboard. The Synthflow connection uses your API key, so it inherits the permissions of that key. Create separate keys per environment and rotate them regularly.

The base URL for all API requests is `https://api.synthflow.ai/v2/`.

## Features

### Agent Management

Create, update, and delete AI voice agents programmatically. Agents can be configured as inbound or outbound, with customizable prompts, greetings, voice selection, and agent type. Agents support PII redaction, which when enabled automatically removes sensitive data from transcripts, webhook payloads, and logs.

### Call Orchestration

Launch live calls, fetch call history, or monitor active conversations. Initiate real-time phone calls through an AI agent by specifying the agent ID, recipient phone number, recipient name, custom variables for dynamic prompt injection, and optional parameters like email and timezone for appointment booking. Call results include transcripts, recordings, status, duration, and collected variables.

### Simulations & Testing

Generate test cases and run rehearsal calls before going live. Simulations include a comprehensive set of endpoints to manage Test Cases, Test Suites, and Simulation Sessions programmatically. Previously created agent-based tests are grouped into Test Suites, and custom test cases are also grouped based on the most recently updated agent.

### Custom Actions

Custom actions allow you to extend your agent's capabilities by integrating external APIs. Whether pulling in live information, creating new records, or adjusting conversational flow based on external inputs, custom actions make your agent more capable. Actions can be registered, attached to agents, and configured with various HTTP methods (GET, POST, PUT, PATCH, DELETE). Actions can be triggered at different stages of a call.

### Knowledge Bases & Voices

Upload domain content, manage sources, and browse voice options. Knowledge bases allow agents to reference specific domain information during calls. Voices can be browsed and assigned to agents.

### Telephony & Phone Numbers

Provision phone numbers, manage contacts, and work with memory stores. Phone numbers can be assigned to agents for inbound and outbound calling. Contacts can be managed in phone books.

### Chat

Synthflow supports chat-based agents in addition to voice. Chat agents can be built, launched, and integrated into websites and apps.

### Analytics

Pull usage summaries or export granular metrics for your BI stack. Analytics export supports datetime-based filtering for precise time-based queries.

### Subaccounts (Agency)

Manage subaccounts for agency-level operations. Concurrency is set by your plan, and accounts and subaccounts share the main account's total.

### Webhook Logs

Webhook logs track all webhook interactions and their delivery status. Monitor both inbound webhooks and post-call webhooks in one place.

## Events

Synthflow supports two types of webhooks:

### Post-Call Webhook

Webhooks allow you to receive real-time notifications when a call is completed, eliminating the need to manually check for updates. Add a webhook URL to the request in order to receive information after the call. Specify the Webhook URL in your API request body using the `external_webhook_url` key. The post-call webhook payload includes:

- Call status (completed, busy, failed, no answer, hangup on voicemail, etc.)
- End call reason
- Transcript and recording URL
- Lead details
- Collected variables (slots) from conversation flows, allowing you to access user-provided information programmatically.
- Executed action results

The webhook URL can be set per-call in the API request body or configured at the agent level.

### Inbound Call Webhook

You can intercept, reroute and decline every incoming call with inbound call webhooks. You receive a JSON payload (event: `call_inbound`) within 10 seconds after a call is initiated. Your endpoint must respond with an updated `call_inbound` object to assign an agent to the call or update the metadata. This allows dynamic routing of inbound calls to different agents, injecting custom variables and metadata, or rejecting calls by responding with an empty object. A `default_agent` can be specified as a fallback if the webhook endpoint fails to respond.
