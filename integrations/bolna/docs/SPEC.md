Now let me check the list of call statuses and the phone numbers API to round out my understanding.# Slates Specification for Bolna

## Overview

Bolna is a Voice AI platform for building, deploying, and managing conversational voice agents that can make and receive phone calls. It orchestrates ASR (speech-to-text), LLM, and TTS (text-to-speech) pipelines to enable automated voice conversations, with a focus on multilingual support and Indian languages. Common use cases include customer support, sales outreach, recruitment interviews, appointment scheduling, and lead qualification.

## Authentication

Bolna uses **Bearer token (API key)** authentication.

To obtain an API key:

1. Log in to the Bolna dashboard at `https://platform.bolna.ai`.
2. Navigate to the **Developers** tab from the left menu.
3. Click **Generate a new API Key**.
4. Save the key securely — it is shown only once.

All API requests must include the key in the `Authorization` header:

```
Authorization: Bearer <your_api_key>
```

The base URL for the API is `https://api.bolna.ai`.

There are no OAuth flows or scopes. A single API key provides access to all resources within the account.

## Features

### Agent Management

Create, update, retrieve, and list Voice AI agents. Each agent is configured with a name, welcome message, system prompt, LLM provider/model selection, ASR (transcriber) provider, TTS (synthesizer) provider and voice, and tool/function configurations. Agents can be assigned tasks with sequential or parallel execution pipelines. Agents can also be imported or cloned from a shared agents library.

### Outbound Calling

Initiate outbound phone calls from an agent to a specified recipient number. Calls can use Bolna's default phone numbers, numbers purchased through Bolna, or numbers from a connected telephony provider (Twilio, Plivo, Exotel, Vobiz). Dynamic context variables (e.g., customer name, plan details) can be passed per call to personalize the conversation.

### Inbound Call Handling

Associate an agent with a specific phone number to automatically answer inbound calls. Supports IVR setup and caller identification via CSV, Google Sheets, or CRM API lookups to prefill context before the conversation begins. Inbound access can be restricted to known numbers only.

### Batch Calling

Automate outbound calls to large contact lists by uploading a CSV file with phone numbers and per-contact variables. Batches can be scheduled for a specific time, started, stopped, and monitored. Supports auto-retry for unanswered calls. Phone numbers must be in E.164 format with `contact_number` as the header column.

### Knowledge Base

Upload PDF documents or add URLs to create knowledge bases that agents can reference during conversations using RAG (Retrieval-Augmented Generation). Multiple knowledge bases can be connected to a single agent. Only `.pdf` files are supported for document uploads.

### Function Calling / Tool Integration

Agents can invoke external APIs and tools during live conversations. Pre-built functions include call transfer to human agents, Cal.com calendar slot checking, and Cal.com appointment booking. Custom function tools can be defined with arbitrary API endpoints that the LLM can call in real-time.

### Call Executions & Analytics

Retrieve execution history for agents, including transcripts, recordings, conversation duration, cost breakdowns, and telephony metadata. Raw logs (prompts, model requests/responses) can be fetched per execution. Post-call tasks include automatic conversation summarization and structured data extraction using custom extraction rules.

### Phone Number Management

Purchase phone numbers directly through the Bolna dashboard, including Indian 140 & 160-series regulated numbers. Truecaller verification is available for purchased numbers. Alternatively, connect your own telephony provider account.

### Voice Management

Import voices from supported TTS providers (ElevenLabs, Cartesia, Azure, etc.) or clone a custom voice for use with agents.

### Provider Connections

Connect your own accounts for LLM, TTS, ASR, and telephony providers to use your own API keys and reduce costs. Bolna supports providers including OpenAI, Anthropic, Deepgram, Azure, ElevenLabs, Twilio, Plivo, and others. Custom/self-hosted LLMs are also supported.

### Sub-Accounts (Enterprise)

Enterprise users can create and manage sub-accounts for multi-tenant or organizational use cases.

## Events

Bolna supports webhooks for receiving real-time call status updates. A webhook URL is configured per agent (in the agent's `webhook_url` field or via the Analytics Tab).

### Call Status Updates

When a call's status changes, Bolna sends an HTTP POST request to the configured webhook URL with the full execution data payload. The payload includes transcript, cost breakdown, telephony metadata, extracted data, transfer call data, and batch run details.

- **Statuses delivered**: `queued`, `rescheduled`, `initiated`, `ringing`, `in-progress`, `call-disconnected`, `completed`, `balance-low`, `busy`, `no-answer`, `canceled`, `failed`, `stopped`, `error`.
- The `completed` status is the final event, sent after all post-call processing (recordings, data extraction) is finished.
- Webhooks are sent from a fixed IP address (`13.203.39.153`) that should be whitelisted.
- The payload structure matches the Get Execution API response format.
- There is no granular event subscription — all status updates for an agent's calls are sent to the single configured webhook URL.
