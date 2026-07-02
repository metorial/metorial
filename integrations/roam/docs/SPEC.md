Let me check the Postman collection and the official Roam Research backend API details.Now I have enough information to write the specification. Let me also check the Roam Research backend API on GitHub for more details about the available endpoints.Now I have sufficient information. Let me compile the specification.

# Slates Specification for Roam

## Overview

Roam Research is a note-taking tool for networked thought that organizes information as a graph database of interconnected pages and blocks. It is as easy to use as a word document or bulleted list, and as powerful for finding, collecting, and connecting related ideas as a graph database. It provides a Backend API (currently in public beta) that allows external programmatic access to read and write graph data.

## Authentication

Roam Research uses API token-based authentication. Roam Research uses API keys for authentication.

**Generating a Token:**

This API is used outside of the Roam Research webapp. You can create and edit roam-graph-tokens from a new section "API tokens" in the "Graph" tab in the Settings. Only graph owners can generate API tokens. Tokens have an **Access Scope** that can be set to either **read** or **edit**. In most cases, you want to change the "Access Scope" of the token from "read" to "edit".

**Using the Token:**

All API requests are scoped to a specific graph and authenticated via a Bearer token. The base URL pattern is:

`https://api.roamresearch.com/api/graph/{GRAPH_NAME}/{action}`

The token is passed as an `X-Authorization: Bearer {api_token}` header (or as a standard `Authorization: Bearer {api_token}` header).

**Required credentials:**

- **API Token**: Generated from Roam Settings → Graph → API Tokens.
- **Graph Name**: The name of the Roam graph to access.

**Limitations:**

- You might not be the owner of the graph (only graph owners can create API tokens). The graph may be an encrypted graph — Roam's backend does not work with encrypted graphs, due to them being end-to-end encrypted.

## Features

### Page Management

Create, update, and delete pages in a Roam graph. Available operations include `createPage`, `updatePage`, and `deletePage`. Pages are identified by their title.

### Block Management

Create, update, move, and delete blocks (the fundamental content units in Roam). Available operations include `createBlock`, `moveBlock`, `updateBlock`, and `deleteBlock`. Blocks are identified by unique UIDs and can be nested hierarchically under pages or other blocks.

- Blocks support Roam's markup syntax including `[[page references]]`, `#tags`, `((block references))`, and TODO/DONE markers.
- Blocks can be positioned by specifying a parent UID and order.

### Datalog Querying

Query the graph database using Datalog, a declarative query language. This allows powerful, flexible retrieval of data across the entire graph based on relationships between pages and blocks.

- Queries use the Datomic-style Datalog syntax (`:find`, `:where` clauses).
- Supports parameterized queries via `args`.
- The `pull` operation can retrieve specific entity data by pattern.
- Queries can search for blocks by content, find pages by title, traverse references, and perform aggregations.

### Data Pull

Retrieve structured data for a specific entity (page or block) by its identifier. This complements the query feature by providing a direct lookup mechanism to pull all or selected attributes of a known entity.

### Daily Notes

Add content as child blocks to a daily note page. This is useful for quick capture and journaling workflows.

- Content is typically prepended or appended to the current day's page.
- The daily page UID follows a date-based format (e.g., `MM-DD-YYYY`).

### Graph Export

Export the full graph data as JSON for backup or synchronization purposes.

- Roam's backend does not work with encrypted graphs, so exports are only available for non-encrypted graphs.

## Events

The provider does not support events. Roam Research's Backend API does not offer webhooks or built-in event subscription mechanisms for receiving real-time notifications about changes in a graph.
