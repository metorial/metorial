# Slates Specification for Anchor Browser

## Overview

Anchor Browser is a cloud-hosted browser automation platform that enables AI agents to interact with websites like a human would. It provides managed Chromium instances with proxy support, CAPTCHA solving, and identity management, allowing automation of web-based workflows — especially for applications that lack APIs. The API base URL is `https://api.anchorbrowser.io/v1`.

## Authentication

Anchor Browser uses API key authentication. All API requests must include the API key in the request header:

- **Header name:** `anchor-api-key`
- **Value:** Your API key, obtained from the Anchor Browser console/dashboard.

Example:

```
curl --request POST \
  --url https://api.anchorbrowser.io/v1/sessions \
  --header 'anchor-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json'
```

There are no OAuth flows, scopes, or additional credentials required. A single API key is sufficient for all API operations.

## Features

### Browser Session Management

Create, list, retrieve, and terminate cloud-hosted browser sessions. Sessions can be configured with options for proxy (residential or custom, with country selection), CAPTCHA solving, ad blocking, popup blocking, stealth mode, session recording, idle timeout, and maximum duration. Sessions provide a live view URL for real-time interactive observation. File upload and download within sessions is supported.

- **Proxy options:** Anchor residential proxy with country code targeting, or custom proxy configuration. Sticky IP sessions are available for consistent identity.
- **Headless/headful mode:** Sessions can run headless or with a visible UI via the embedded live view.
- **Session tags:** Tag sessions with metadata for organization and filtering.

### Browser Profiles

Profiles store persistent browser state (cookies, local storage, cache) from a session and allow reuse across future sessions. This enables maintaining authenticated states across multiple automation runs without re-logging in each time.

- Profiles are created from an active session and saved when the session terminates.
- A dedicated sticky IP can be assigned per profile.
- Profiles can be listed, retrieved, and deleted.

### AI-Powered Web Task Execution

Submit a natural language prompt describing a task along with a target URL, and an AI agent will autonomously navigate and complete the task in a browser session. Supports synchronous and asynchronous execution.

- **Agent options:** `browser-use`, `openai-cua`, `gemini-computer-use`, `anthropic-cua`.
- **Provider/model selection:** Choose from providers like OpenAI, Gemini, Groq, Azure, xAI with specific model selection.
- **Configuration:** Maximum steps, element detection, element highlighting, human intervention mode, secret values for credential injection, and output schema for structured results.
- Tasks can optionally reference an existing running session.

### Applications and Authentication Flows

Define "applications" (target websites/services) and configure authentication flows for them. Create and manage identities (user credentials) that can be associated with applications for automated login flows.

- Create application definitions with associated authentication flows.
- Create identity tokens for authenticated access.
- Manage identity credentials securely.

### OS-Level Control

Provides low-level control over the browser environment including mouse clicks, double clicks, drag-and-drop, scrolling, keyboard input, text typing, keyboard shortcuts, clipboard operations (get/set/copy/paste), navigation, and screenshot capture. Useful for interacting with elements that aren't accessible via standard browser APIs.

### Web Content Tools

Standalone tools for fetching webpage content (text/structured), taking screenshots, and generating PDFs from web pages — without needing a persistent session.

### Session Recordings

Sessions can be recorded for later review. Recordings can be paused, resumed, listed, and retrieved.

### Browser Extensions

Upload, list, manage, and use custom Chrome extensions within browser sessions (e.g., ad blockers, privacy tools).

### Batch Browser Sessions

Create and manage multiple browser sessions as a batch operation. Supports listing, status monitoring, updating, deleting, and retrying failed batch sessions.

### Agentic Capabilities

Upload resources (files, data) to be accessible to AI agents during task execution. Pause and resume running agents.

### Event Coordination

Real-time event signaling between external systems and active browser sessions. Useful for injecting data (e.g., MFA codes) into a running browser automation from an external source. Supports signaling named events with custom data payloads and waiting for named events with configurable timeouts.

### Integrations

List, create, and delete third-party integrations configured on the account.

## Events

The provider does not support webhooks or event subscription mechanisms for external consumers. The "Event Coordination" feature is an internal signaling mechanism between external systems and active browser sessions (e.g., sending MFA codes into a running session), not an event subscription/webhook system.
