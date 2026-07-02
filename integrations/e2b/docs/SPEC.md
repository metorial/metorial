# Slates Specification for E2B

## Overview

E2B is an open-source cloud infrastructure platform that provides secure, isolated sandbox environments (lightweight Linux VMs) for executing AI-generated code. E2B provides isolated sandboxes that let agents safely execute code, process data, and run tools. It offers a core SDK for sandbox management, a Code Interpreter SDK for running code in Jupyter-like environments, and a Desktop Sandbox SDK for GUI-based computer use scenarios.

## Authentication

E2B uses API key-based authentication. An E2B API key is used for authentication, set via the `E2B_API_KEY` environment variable. API keys are prefixed with `e2b_` (e.g., `e2b_***`) and can be obtained from the E2B dashboard after signing up.

The platform uses dual protocols: a REST API for sandbox lifecycle management (create, kill, timeout) with API key authentication, and gRPC for real-time operations (filesystem, commands, terminals) with access token authentication. An E2B access token can also be used for authentication, set via the `E2B_ACCESS_TOKEN` environment variable.

A dual system uses API keys for the main E2B API and separate, short-lived access tokens for communicating with individual sandboxes.

The API key is passed via the `X-API-Key` header when making direct REST API calls (e.g., to `https://api.e2b.app`). Operations are scoped to the team associated with the API key.

## Features

### Sandbox Lifecycle Management

Create, list, connect to, and terminate cloud sandboxes on demand. A sandbox is a fast, secure Linux VM created on demand for your agent. Sandboxes can be created from default or custom templates, configured with custom environment variables and metadata, and given a configurable timeout. After the timeout expires the sandbox will be automatically killed. Maximum time a sandbox can be kept alive is 24 hours for Pro users and 1 hour for Hobby users.

### Code Execution

Execute code inside sandboxes using a Jupyter-based code interpreter. The sandbox provides a secure, isolated environment for executing code in various programming languages. Supports Python, JavaScript, and other languages via Jupyter kernels. Code execution is stateful within a session, meaning variables and state persist across multiple execution calls.

### Command Execution

Run shell commands inside sandboxes via an interactive terminal interface. This includes installing packages, running scripts, and managing processes within the sandbox environment.

### Filesystem Operations

The sandbox provides an isolated filesystem where you can create, read, write, and delete files, and securely upload data to it or download results from it.

### Sandbox Persistence (Pause/Resume)

Sandbox persistence allows you to pause your sandbox and resume it later from the same state, including not only the filesystem but also the sandbox's memory — all running processes, loaded variables, data, etc. Supports auto-pause on timeout so sandboxes are paused instead of killed. Paused sandboxes can be listed, resumed, or permanently deleted.

### Snapshots

Create persistent snapshots of a running sandbox's state. The sandbox is briefly paused while a persistent snapshot is being created, then automatically returns to running. Snapshots enable rapidly spinning up new sandboxes from a known state.

### Custom Templates

Define custom sandbox environments using Dockerfiles. Completely customize the sandbox for your use case by creating a custom sandbox template or installing a package when the sandbox is running. Templates can specify CPU, memory, start commands, and pre-installed dependencies. Templates are built via the E2B CLI and referenced by name or ID when creating sandboxes.

### Desktop Sandbox (Computer Use)

E2B Desktop Sandbox is an open source secure virtual desktop ready for Computer Use. The desktop-like environment is based on Linux and Xfce. Provides programmatic mouse and keyboard control (click, type, scroll, drag), application launching, screenshot capture, and live desktop streaming. Designed for AI agents that need to interact with GUI applications.

### Network Access and Port Forwarding

Sandboxes have internet access. You can get the host address for a specified sandbox port and use this address to connect to the sandbox port from outside via HTTP or WebSocket.

### MCP Gateway

Sandboxes can be configured with MCP (Model Context Protocol) servers at creation time, enabling AI agents running inside sandboxes to interact with external services through a standardized protocol.

### Storage Bucket Connection

Sandboxes support connecting external storage buckets for persistent data that outlives the sandbox lifecycle.

## Events

Webhooks provide a way for notifications to be delivered to an external web server whenever certain sandbox lifecycle events occur, allowing you to receive real-time updates about sandbox creation, updates, and termination without having to poll the API.

### Sandbox Lifecycle Events

Register webhooks to listen for sandbox lifecycle changes. The supported event types are:

- **`sandbox.lifecycle.created`** — Fired when a new sandbox is created.
- **`sandbox.lifecycle.updated`** — Fired when a sandbox is updated (e.g., timeout change).
- **`sandbox.lifecycle.killed`** — Fired when a sandbox is terminated.

All webhook requests require authentication using your team API key. When registering a webhook, you provide a target URL, the list of event types to subscribe to, and a signature secret for verifying request authenticity. Each webhook request includes a signature in the `e2b-signature` header that can be verified using the signature secret, confirming that the request originated from E2B and has not been tampered with. Webhooks can be created, listed, retrieved, updated, and deleted via the REST API.
