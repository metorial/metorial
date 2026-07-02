# Slates Specification for Retell AI

## Overview

Retell AI is a platform for building, testing, deploying, and monitoring AI phone agents. It provides a complete solution for creating conversational AI agents that can handle phone calls naturally, supporting both inbound and outbound calls with integration into various telephony providers.

## Authentication

Retell AI uses API key-based authentication. The API requires an `Authorization` header containing the API key. The format is `Bearer YOUR_API_KEY`.

API keys can be obtained from the "API Keys" tab in the Retell AI dashboard. One of the API keys is automatically designated for webhook signature verification.

There are no OAuth flows or scopes. All API access is controlled through the API key, which grants full access to the account's resources.

**Example:**

```
Authorization: Bearer YOUR_API_KEY
```

## Features

### Voice Agent Management

Create, configure, update, and manage AI voice agents. Agents can be set up as either prompt-based agents (single/multi prompt) for dynamic conversations, or conversation flow agents for structured interactions with fine-grained control. Agents can be configured with voices from multiple providers including ElevenLabs, OpenAI, Deepgram, Cartesia, MiniMax, and Fish Audio. Agents support versioning and publishing.

### Chat Agent Management

Create and manage chat-based AI agents separately from voice agents. Chat agents support text-based interactions and can be published with versioning support.

### Phone Call Operations

Make and receive phone calls with Retell-owned or user-owned phone numbers. Outbound calls can be initiated programmatically by specifying source and destination numbers. Dynamic variables can be injected into prompts and tool descriptions on a per-call basis. Calls can be overridden with a different agent or agent version for one-time use. Call details include transcripts, recordings (including multi-channel and PII-scrubbed versions), latency metrics, cost breakdowns, and disconnection reasons.

### Web Call Operations

Initiate browser-based voice calls via WebRTC without telephony infrastructure.

### Batch Calls

Create batch outbound calling campaigns to automate large-scale outreach operations.

### Chat and SMS

Create text-based chat sessions, send outbound SMS messages, and create chat completions. Chats can be updated and ended programmatically.

### Phone Number Management

Purchase, import, list, update, and delete phone numbers. Separate inbound and outbound agents can be assigned to phone numbers, with the option to disable either.

### Response Engine Configuration (Retell LLM)

Create and manage Retell LLM configurations used as response engines for single/multi prompt agents. These define how the agent generates responses, including prompt configuration and tool definitions.

### Conversation Flow Management

Create and manage conversation flows used as response engines for conversation flow agents. Flows define structured dialogue paths with nodes and transitions. Reusable conversation flow components can also be created and shared across flows.

### Knowledge Base Management

Create and manage knowledge bases that agents can reference during conversations. Knowledge bases support document sources, can be auto-refreshed, and individual sources can be added or removed.

### Voice Management

Browse, search, add, and clone voices. Voices can be filtered by provider, gender, accent, and age.

### Post-Call Analysis

Extract insights from completed calls including call summaries, user sentiment, success evaluation, voicemail detection, and custom analysis data fields.

### Testing

Define test cases and run batch simulation tests against agents to validate behavior at scale. Test runs and their results can be retrieved programmatically.

### Custom Telephony (SIP)

Integration with custom telephony providers via SIP is supported. Phone numbers can be imported and calls can be registered from external telephony systems.

### Custom LLM

Connect your own LLM via WebSocket for full control over response generation instead of using Retell's built-in LLM.

### Concurrency Management

Check current call concurrency usage and limits for the account.

## Events

Webhooks allow your application to receive real-time notifications about events that occur in your Retell AI account, pushing data as events happen.

Webhook URLs can be configured at two levels: at the agent level (via the `webhook_url` field on the agent), where any event associated with that agent is pushed to the agent's webhook URL, overriding the account-level webhook URL. An account-level webhook URL serves as the default.

Each webhook request includes an `x-retell-signature` header that can be verified using the Retell API key to confirm authenticity.

### Call Lifecycle Events

- **`call_started`**: Triggered when a call begins.
- **`call_ended`**: Triggered when a call ends. The payload contains the full call details, including transcripts, recordings, metadata, and disconnection reason.
- **`call_analyzed`**: Triggered after post-call analysis is complete, including summary, sentiment, and custom analysis data.

### Transcript Events

- **`transcript_updated`**: Provides real-time transcript updates during the call, including transcript with tool calls.

### Transfer Events

- **`transfer_started`**: Triggered when a call transfer is initiated. Includes transfer destination and transfer options (e.g., warm/cold transfer).
- **`transfer_bridged`**: Triggered when the transferred call is successfully connected.
- **`transfer_cancelled`**: Triggered when a transfer is cancelled.
- **`transfer_ended`**: Triggered when the transferred call ends.
