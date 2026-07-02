# Slates Specification for Splunk

## Overview

Splunk is a platform for searching, monitoring, and analyzing machine-generated data (logs, metrics, events) via a web-based interface. It provides data ingestion, indexing, search and analytics using its Search Processing Language (SPL), alerting, dashboards, and a key-value store. It is available as Splunk Enterprise (self-hosted) and Splunk Cloud Platform.

## Authentication

Splunk supports the following authentication methods for its REST API:

### 1. Session Token Authentication (Username/Password)

The API supports token-based authentication using the standard HTTP Authorization header. You get a session key using the `/services/auth/login` endpoint by posting username and password credentials. In subsequent requests, set the header `Authorization` value to the session key, e.g., `Authorization: Splunk <sessionKey>`. The default authenticated session timeout is one hour.

### 2. Splunk Authentication Tokens (JWT-based)

In version 7.3 and higher of the Splunk platform, you can also use Splunk authentication tokens to access REST endpoints, without the need to authenticate with credentials and obtain a session key. Tokens must be valid and must not have expired, and the instance you want to access must have token authentication enabled. There is no need to perform a separate login task to obtain a token, but you must provide the token with each web request.

Tokens support Bearer header (standard for JWTs) or the Splunk header for authentication. Example: `Authorization: Bearer <token>` or `Authorization: Splunk <token>`.

Tokens are available for both native Splunk authentication and external authentication through either the LDAP or SAML schemes. You cannot use a token on any instance other than the instance where the administrator granted you the token.

### 3. HTTP Basic Authentication

Splunk Enterprise also supports basic authentication, as defined by RFC 1945. Use standard `username:password` base64-encoded credentials in the `Authorization: Basic` header.

### Required Connection Parameters

- **Host**: The Splunk instance hostname or IP address.
- **Management Port**: Default is `8089` for the REST API.
- **HEC Port**: Default is `8088` for the HTTP Event Collector.
- **Scheme**: HTTPS is strongly recommended and required for Splunk Cloud Platform.

Splunk users must have role and/or capability-based authorization to use REST endpoints. Access is governed by Splunk's role-based access control (RBAC) system.

## Features

### Search and Analytics

API functions allow you to either run searches, or manage objects and configuration. You can programmatically execute searches using Splunk's Search Processing Language (SPL), create search jobs (normal, real-time, or export), monitor job status, and retrieve results in JSON, XML, or CSV formats. This includes ad-hoc searches, scheduled searches, and real-time searches.

### Saved Searches and Alerts

Manage search resources including alerts triggered by searches, Python search command information, saved searches, search results, and scheduled view objects. You can create, read, update, delete, and schedule saved searches. Alerts can be configured with trigger conditions and actions (including webhook callbacks).

### Data Ingestion (HTTP Event Collector)

The HTTP Event Collector (HEC) lets you send data and application events to a Splunk deployment over the HTTP and Secure HTTP (HTTPS) protocols. HEC uses a token-based authentication model. You can generate a token and then configure a logging library or HTTP client with the token to send data to HEC in a specific format. This process eliminates the need for a Splunk forwarder when you send application events. HEC accepts both JSON-formatted events (via `/services/collector`) and raw text (via `/services/collector/raw`). Metadata such as host, source, sourcetype, index, and timestamp can be specified per event.

### Data Input Management

You can manage various data inputs programmatically, including TCP/UDP inputs, file monitoring, scripted inputs, and HTTP Event Collector tokens. This lets you configure how data enters the Splunk environment.

### Index Management

Through the API, you can create and manage indexes, which are the repositories where Splunk stores ingested data. You can configure index properties such as retention policies and storage settings.

### Knowledge Objects Management

The API allows managing knowledge objects such as event types, field extractions, lookups, tags, macros, and data models. These objects enrich data and support search and reporting workflows.

### KV Store (Key-Value Store)

The app key value store (or KV store) provides a way to save and retrieve data within your Splunk apps, thereby letting you manage and maintain the state of the application. The KV Store supports create, read, list and delete operations on collections, and create, read, list and delete indexes for a given collection. It supports querying with a MongoDB-like query syntax, projection, and sorting.

- All updates are wholesale updates. Partial value updates are not available.

### User and Role Management

You can manage users, roles, and capabilities through the API. This includes creating and modifying users, assigning roles, and configuring authentication settings (including LDAP).

### App Management

The API allows listing, installing, updating, and removing Splunk apps on the instance.

### Server and Deployment Configuration

The Splunk platform REST API gives you access to the same information and functionality available to core system software and Splunk Web. This includes managing server settings, monitoring server health and introspection data, and configuring deployment settings.

### Dashboard and View Management

You can create, update, and delete dashboards and views programmatically, enabling automated management of visualization and reporting assets.

## Events

Splunk supports outbound webhooks as alert actions rather than traditional event subscription webhooks.

### Alert-Triggered Webhooks (Outbound Only)

Webhooks let you define custom callbacks on a particular web resource. For example, you can set up a webhook to make an alert message pop up in a chat room or post a notification on a web page. When an alert triggers, the webhook makes an HTTP POST request to the URL.

- Webhooks are configured as alert actions on saved searches/alerts. When the alert's trigger conditions are met, Splunk sends an HTTP POST with JSON payload to the specified URL.
- The webhook POST request's JSON data payload includes search ID, result data, results link, search name, owner, and app context.
- The webhook URL must be added to an allow list (Splunk Enterprise 9.0+).
- This is an outbound-only mechanism — Splunk pushes notifications when its own alerts fire. There is no inbound webhook subscription API to listen for arbitrary Splunk system events externally.
