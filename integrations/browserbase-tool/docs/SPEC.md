# Slates Specification for Browserbase

## Overview

Browserbase is a cloud platform for running headless browsers. It provides infrastructure for running headless browsers, enabling automations that interact with websites, fill out forms, or replicate user actions, so users don't have to maintain their own fleet of headless browsers. It supports Playwright, Puppeteer, and Selenium at scale with stealth mode, session persistence, and debugging tools.

## Authentication

All REST endpoints are authenticated using a Browserbase API Key, passed as a custom header `X-BB-API-Key`.

- **API Key**: Obtained from the [Browserbase dashboard settings](https://www.browserbase.com/settings).
- **Header**: `X-BB-API-Key: <your-api-key>`
- **Base URL**: `https://api.browserbase.com/v1/`

Additionally, a Project ID is required for most operations and can be found in the Browserbase dashboard. The Project ID is not an authentication credential but is needed as a parameter when creating sessions and managing resources.

## Features

### Session Management

A browser session is the fundamental building block — it represents a single browser instance running in the cloud. Users can create and configure browser sessions, connect and interact with them using their preferred framework, manage session lifecycle and termination, and monitor and debug sessions in real-time.

- Sessions can be configured with a specific **region** (`us-west-2`, `us-east-1`, `eu-central-1`, `ap-southeast-1`).
- A **timeout** (in seconds) can be set, after which the session automatically ends. Defaults to the project's `defaultTimeout`.
- **Keep Alive** can be enabled to keep the session alive even after disconnections. Available on the Hobby Plan and above.
- **Proxy configuration** can be set to `true` for a default proxy, or provided as an array of proxy configurations with geolocation options.
- Arbitrary **user metadata** can be attached to sessions.
- Sessions expose both a **WebSocket URL** and an **HTTP URL** for connecting via browser automation frameworks.

### Session Observability

- Browser session recording, source code capture, and command logging enable debugging of past sessions.
- **Session Logs**: Retrieve detailed CDP (Chrome DevTools Protocol) logs for a session, including request/response data.
- **Session Recording**: Retrieve session replay data with timestamped events.
- **Session Live URLs**: Get debugger URLs and WebSocket URLs for real-time session inspection and live viewing.

### Contexts (Persistent Browser State)

Contexts allow persisting user data across multiple browser sessions. By default, each session starts with a fresh user data directory. With Contexts, cookies and application data can be reused across sessions, eliminating repeated logins.

- Contexts enable reusing cookies and session data, preserving authentication tokens, and retaining localStorage, IndexedDB, and other site-specific data.
- Contexts persist indefinitely until explicitly deleted or invalidated.
- Context data is encrypted at rest.

### Browser Extensions

Custom Chrome extensions can be uploaded and loaded into browser sessions. Create a new session using the Sessions API and include the `extensionId` parameter.

- Extensions must be uploaded as a valid Chrome extension in `.zip` format containing a `manifest.json` at the root.
- Starting a session with an extension increases session creation time since the browser must be restarted to load the extension.

### File Uploads and Downloads

The API supports file uploads, downloads, and custom browser extensions. Files can be uploaded to sessions and downloads from sessions can be retrieved.

### Project Management

Projects can be listed via the API, returning project details including name, owner, and default timeout settings. Project usage data (browser minutes and proxy bytes) can be retrieved for a given project.

### Stealth Mode and Anti-Detection

Managed captcha solving, residential proxies, and fingerprint generation help keep automations running smoothly. Proxies can be configured with geolocation targeting at the city, state, and country level.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms. Browserbase is primarily a session-based API for creating and interacting with cloud browser instances, and does not offer webhook callbacks or event streams for session lifecycle changes.
