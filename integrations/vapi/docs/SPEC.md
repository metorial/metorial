Now let me get the server events page for more detail on webhook event types:Now I have all the information I need. Let me compose the specification.

# Slates Specification for Vapi

## Overview

Vapi is a developer platform for building voice AI agents. It provides APIs for creating and managing voice assistants that can make and receive phone calls, conduct web-based voice conversations, and orchestrate multi-assistant workflows (squads). The platform combines speech-to-text, LLM, and text-to-speech components with support for dozens of providers including OpenAI, Anthropic, Google, Deepgram, and ElevenLabs.

## Authentication

Vapi supports two authentication methods for its REST API at `https://api.vapi.ai`:

### API Key (Bearer Token)

Pass your Vapi API key as a bearer token in the `Authorization` header: `Authorization: Bearer YOUR_VAPI_API_KEY`. You receive API keys after signing up at vapi.ai, accessible from the dashboard.

### JWT Authentication

Vapi also supports JWT (JSON Web Token) authentication. To generate a JWT, you need your organization ID (`orgId`) and a private key provided by Vapi (both found in the Vapi portal). The generated JWT token is then used in the `Authorization` header prefixed with `Bearer`. If you set the scope to `private`, you can use it to make authenticated API requests. JWT tokens support configurable expiration times and are suited for scenarios requiring scoped, time-limited access.

## Features

### Assistant Management

Create, configure, and manage voice AI assistants. Each assistant combines a transcriber (speech-to-text), an LLM (language model), and a voice (text-to-speech). Configurable options include the first message, system prompt, voice provider/voice ID, model provider/model, turn-taking behavior, interruption handling, background denoising, voicemail detection, and max call duration. Assistants support fallback plans for each component.

### Call Management

Initiate, list, retrieve, and manage voice calls with sub-600ms response times and natural turn-taking. Calls can be inbound phone calls, outbound phone calls, or web-based calls. Outbound calls can target a specific customer phone number or SIP URI. Calls can be scheduled for a future time. Each call produces artifacts including recordings (audio/video), transcripts, structured data, and performance metrics (latency breakdowns).

### Squads (Multi-Assistant Orchestration)

Squads orchestrate multiple assistants with context-preserving transfers. A squad is composed of members, each with an assistant and defined transfer destinations to other members. This enables workflows where specialized assistants handle different parts of a conversation.

### Workflows

Define node-based conversational flows where each node can have its own model, transcriber, voice, tools, and prompt. Nodes are connected via edges with AI-driven or rule-based conditions. Workflows support a global prompt and global node plans.

### Phone Number Management

Provision and manage phone numbers for inbound and outbound calling. Supports Twilio, Vonage, Telnyx, and custom SIP-based providers. Phone numbers can be assigned to a specific assistant, squad, or workflow. Phone number hooks allow routing logic (e.g., transferring based on caller number patterns).

### Tool Integration

Attach tools to assistants that the LLM can invoke during conversations. Tool types include API requests (HTTP calls to external services), code execution, and MCP (Model Context Protocol) tools. Plug in your APIs as tools to intelligently fetch data and perform actions on your server. Tools support custom headers, request bodies, retry/backoff plans, and variable extraction from responses.

### Knowledge Base

Attach a knowledge base to assistants for retrieval-augmented generation. Supports custom knowledge base providers where your server receives queries and returns relevant documents.

### Files

Upload and manage files that can be used as knowledge sources for assistants.

### Chats

Create and manage text-based chat sessions with assistants. Supports an OpenAI-compatible chat endpoint. Chat sessions can be linked to sessions for continuity.

### Outbound Campaigns

Create and manage outbound call campaigns for bulk calling. Campaigns are linked to an assistant or workflow and target a list of customers.

### Analytics and Observability

Query analytics data across calls. Supports structured outputs (AI-extracted or regex-based data from calls), scorecards (metric-based evaluation of calls), insights, and evals (evaluation runs with test suites). Observability integrates with Langfuse for tracing.

### Post-Call Analysis

Configure automatic post-call analysis including call summaries, structured data extraction, and success evaluation with configurable rubrics. Results are available in the call's analysis object.

### Provider Keys (BYOK)

You can bring your own API keys for transcription, LLM, and TTS providers. Once your API key is validated, you won't be charged when using that provider through Vapi.

### Compliance

Supports HIPAA and PCI compliance modes, recording consent plans, and security filter plans for sanitizing sensitive content from conversations.

## Events

Vapi supports webhooks via Server URLs. You configure a server URL on your assistant, phone number, or account level, and Vapi sends POST requests to your server for various call and conversation events.

### Call Status Events

Notifications when a call's status changes. Statuses include: `scheduled`, `queued`, `ringing`, `in-progress`, `forwarding`, and `ended`.

### End of Call Report

Sent when a call ends. Includes the ended reason, full call object, recording URLs, transcript, conversation messages, and analysis results (summary, structured data, success evaluation).

### Function/Tool Calls

Vapi supports OpenAI-style tool/function calling. Assistants can ping your server to perform actions. When the LLM invokes a tool, your server receives the tool call details and must respond with results. Supports synchronous and asynchronous tool execution.

### Assistant Request

For inbound phone calls, you can specify the assistant dynamically. If a PhoneNumber doesn't have an assistantId, Vapi may request one from your server. Your server responds with an assistant ID, a transient assistant configuration, or a transfer destination.

### Transfer Destination Request

Sent when the assistant wants to transfer a call but the destination is not known. Your server responds with the transfer destination.

### Transfer Update

Fires whenever a call transfer occurs, providing details about the destination.

### Conversation Updates

Sent when an update is committed to the conversation history, including the current conversation messages.

### Transcript Events

Real-time partial and final transcripts from the speech-to-text transcriber during a call.

### Speech Updates

Notifications when speech starts or stops for either the assistant or the user.

### Hang Notifications

Sent when the assistant fails to reply for a certain amount of time, useful for surfacing delays.

### User Interrupted

Sent when the user interrupts the assistant's speech.

### Language Change Detected

Sent when the transcriber detects a change in the spoken language.

### Chat Events

Events for chat lifecycle: `chat.created` and `chat.deleted`.

### Session Events

Events for session lifecycle: `session.created`, `session.updated`, and `session.deleted`.

### Knowledge Base Request

If using a custom knowledge base provider, Vapi sends the current conversation context to your server and expects relevant documents in return.
