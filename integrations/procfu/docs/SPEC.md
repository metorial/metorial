# Slates Specification for Procfu

## Overview

ProcFu is an add-on for Citrix Podio that greatly enhances the abilities of Podio Workflow Automations and the functionality of a Citrix Podio account. Its Functions API offers a comprehensive library of endpoints that enable interaction with services including Podio, InfoLobby, Google, Podio Workflow Automation, MySQL, S3 Compatible Storages, FTP, ShareFile, Notion, OAuth Services, and Web Scraping. It also includes a point-and-click app builder for creating web apps using existing tools as the back-office.

## Authentication

ProcFu uses API key-based authentication via HTTP Basic Auth.

A ProcFu API Auth Token is required for running scripts or code from outside systems. Users sign up for a ProcFu account, get their API key, and include it in the `Authorization` header as `Authorization: Basic {API_KEY}`.

The API key can be found on the ProcFu account settings page. All requests to ProcFu functions are made as HTTP POST requests to `https://procfu.com/exe/{script_name}.pf`, with the authorization header included and parameters sent as form data.

When calling ProcFu functions from external servers (outside ProcFu's own infrastructure), those server IPs must be added to a whitelist on the Account page of the ProcFu account.

## Features

### Podio Item Management

Create, read, update, and delete Podio items programmatically. This includes getting items, fetching comments, retrieving related items, fetching items from views, filtering items in apps, and searching items by field value. Items can be created or updated with control over whether notifications and webhooks are triggered.

### Podio Workflow Automation (PWA) Integration

ProcFu provides a Flows system — a powerful engine for automated workflows that can watch items, react to changes, run logic, and take action across a Podio workspace. Flows can trigger on item create, update, or any Podio event. You can also trigger manual GlobiFlow/PWA flows on specific items, trigger flows with delays, and list or manage existing flows.

### ProcScript Code Execution

ProcScript is a programming language that lets users write feature-complex code without worrying about authentication or other API constructs. Scripts can be written in the ProcFu editor, scheduled to run automatically, and called from external systems or from within PWA flows.

### Third-Party OAuth API Integration

ProcFu allows users to make API requests to OAuth2 services that have been previously integrated into a ProcFu account. Users can add custom OAuth2 services by providing client ID, client secret, authorize URL, token URL, and scopes. ProcFu manages the OAuth token lifecycle. Functions exist to get login links for users, check token status, list authenticated users, and make authenticated API requests to connected services.

### MySQL Database Operations

ProcFu supports querying MySQL databases, returning single or multi-row results. Users can sync Podio data to their own MySQL database. Data syncs can be created with a click, and ProcFu manages the ongoing synchronization.

### App Builder (Mini Apps / AppFrame)

With the App Builder, teams can launch purpose-built portals and dashboards, using Podio as a secure backend. Users can create interactive customer portals, vendor platforms, employee centers, and internal data dashboards using a point-and-click interface. Apps support code events and behaviors written in ProcScript.

### File Storage Operations

ProcFu provides functions for working with S3-compatible storage and FTP, including listing storage files and retrieving files as Base64-encoded text.

### Data Utilities

ProcFu includes various utility functions for data transformation: JSON key finding and manipulation, Base64 encoding, markdown-to-HTML conversion, XML-to-JSON conversion, and array diff operations.

### Tape Integration

ProcFu supports querying, creating, reading, updating, and deleting records in Tape apps, as well as making raw API calls to the Tape API.

### InfoLobby and Notion Integration

ProcFu enables interaction with InfoLobby and Notion, including raw API calls to InfoLobby endpoints.

### Deployment Manager

Deployment Manager makes it easy to publish, install, and maintain App Packs and PWA/GlobiFlow Flows across multiple Podio Workspaces.

### AI Integration

ProcFu provides ChatGPT integration within Podio workspaces, enabling AI-powered drafting, classification, and reasoning within workflows.

### Podio Workspace Management

Functions are available for managing workspace members, user profiles, subscriptions (follow/unfollow items), and retrieving recent app activity.

## Events

The provider does not support inbound events (webhooks or event subscriptions) in the traditional sense. ProcFu is designed as an outbound Functions API that is called by external systems. ProcFu's Flows system can react to Podio events (item created, item updated, field changes, date triggers), but these are configured within ProcFu's own flow engine rather than exposed as subscribable webhook endpoints for external consumers.
