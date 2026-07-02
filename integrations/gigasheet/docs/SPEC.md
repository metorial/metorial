# Slates Specification for Gigasheet

## Overview

Gigasheet is a cloud-based spreadsheet platform designed for handling large-scale datasets (CSV, JSON, log files, etc.) that exceed the limits of traditional spreadsheets. The Gigasheet API allows users to automate Gigasheet and connect with external data sources, such as web-based services, databases, and other applications. It provides capabilities for data manipulation, enrichment, filtering, exporting, sharing, and AI-assisted analysis.

## Authentication

Calls to Gigasheet API endpoints are authenticated using a Gigasheet API key. You must obtain a token using the token creation flow in the Gigasheet web application user interface at app.gigasheet.com.

- **Base URL:** `https://api.gigasheet.com`
- **Auth method:** API Key via custom header
- **Header name:** `X-GIGASHEET-TOKEN`
- **Example:**
  ```
  curl -H "X-GIGASHEET-TOKEN: your_api_key_here" https://api.gigasheet.com/user/whoami
  ```

To get started, generate an API key in the left menu on your Library page. Be sure to save your key in a secure place. API keys can also be issued and revoked programmatically via the API.

## Features

### File and Folder Management

Upload, create, copy, rename, move, delete, and organize sheets and folders in your Gigasheet library. Files can be uploaded directly or from a URL (including pre-signed S3 links). You can create blank files, combine multiple files into one, and list files in your library (including shared files).

### Data Manipulation

Modify sheet data at the cell, row, and column level. This includes updating individual cells, inserting blank rows, upserting rows, appending data (from raw input or from another sheet), deleting rows (by selection or by filter criteria), and deleting or renaming columns. You can also run formulas, combine columns, split columns on delimiters, change column data types, change string case, trim whitespace, extract domains from URLs, and explode JSON or delimited columns into separate columns/rows.

### Filtering and Saved Filters

Gigasheet Filters allow you to build complex queries. Users can create nested queries using AND/OR, filter by time or even wildcard and regex matching. Filters can be saved and reused via the API. You can get filtered row and group counts, and apply saved filters to sheets programmatically.

### Aggregations and Grouping

Gigasheet Aggregations make it easy to quickly calculate summary statistics for a given column without requiring any special formula syntax. Gigasheet Groups provide similar functionality to traditional pivot tables, but are easier to navigate. Group organizes rows by a specified categorical column, and collapses rows that meet the specified criteria.

### Views and Sheet State

Create, list, update, and delete named views on a sheet. Set and manage client state including column visibility, sort model, filter model, group columns, and aggregation settings. Views can be converted into linked sheets.

### Export

Create exports of datasets (optionally with filters and groupings applied), download the resulting export files, and initiate exports to external connectors. Exports produce downloadable files via pre-signed URLs.

### Sharing and Permissions

Share files with other users with configurable permissions. Create "live shares" (shareable links that produce CSV data for a sheet). Set organization-level permissions on files. Users can opt out of shared files or request access to files.

### Comments

Add, retrieve, and delete comments at both the cell and column level on any sheet.

### Data Enrichment

Enrich sheet data using built-in enrichment providers (e.g., email validation, geolocation) or custom HTTP-based enrichments where you define an external API endpoint and map sheet columns to API parameters. You can preview enrichment results before applying, track enrichment task status, and cancel running tasks. Enrichments consume credits.

### Data Cleanup

Detect and delete duplicate rows in a sheet. You can count duplicates before performing deletion. Also includes find-and-replace functionality across sheets and company name cleaning.

### AI Assistant

Interact with a sheet using an AI chat assistant that can answer questions about the data. A formula builder AI can help construct formulas. Chat history can be retrieved and deleted. Gigasheet also exposes a Model Context Protocol (MCP) endpoint.

### Connectors (External Data Sources)

Create and manage connections to external data sources and destinations (databases, warehouses, etc.). You can configure connection parameters, run or schedule imports, pause/unpause connectors, export data to external systems, and manage source configurations.

### Cross-File Lookup

Perform lookups across different sheets, similar to VLOOKUP functionality, joining data from one sheet into another based on a matching column.

### Audit and Activity History

Retrieve the action history for a dataset, search through activity logs, and get total activity counts.

### User and Account Management

Retrieve user details and metadata, manage API keys, invite users, manage team membership, and trigger password resets.

## Events

The provider does not support events. Gigasheet's API does not offer webhooks, event subscriptions, or any built-in push notification mechanism for changes to sheets or other resources.
