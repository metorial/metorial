Now let me fetch the API overview documentation to get more details on authentication and features.Now let me look at the actual API sections to understand the full scope of features:I now have enough information to write the specification.

# Slates Specification for Codereadr

## Overview

CodeREADr is a cloud-based barcode scanning and data collection platform that turns smartphones and tablets into enterprise-grade barcode scanners. It provides mobile apps (iOS and Android) for scanning barcodes, NFC tags, and OCR text, paired with web services for managing scanning workflows (called "Services"), validation databases, app users, and scan records. The platform is used for access control, inventory tracking, attendance, ticket validation, asset management, and similar use cases.

## Authentication

CodeREADr uses API keys for authentication. All API requests are made to a single endpoint: `https://api.codereadr.com/api/`.

The API key is passed as a parameter (`api_key`) in each request. Requests include the `api_key` parameter along with `section` and `action` parameters to specify what operation to perform.

For example, to retrieve users:

```
POST https://api.codereadr.com/api/
  section=users
  action=retrieve
  api_key=YOUR_API_KEY
```

The API key can be found in your CodeREADr account settings. All API calls are made via HTTP POST with `application/x-www-form-urlencoded` or `multipart/form-data` encoding. You can optionally define specific IP address ranges which are permitted to call your account APIs for additional security.

API functionality is limited for Free Plan users — a paid plan is required for full API access.

## Features

### Service Management

A Service is a custom workflow you create to enable app users to capture and collect data exactly as you need. Through the API, you can create, edit, retrieve, and delete services. Service types include Record Scans (general data collection), Validate Scans (compare scans against a database), and Check In/Out (track status of scanned values). Services can be configured with advanced settings such as postback URLs, duplicate prevention, date-based access limits, GPS tracking, kiosk mode, and scan filtering rules.

### User Management

App Users are authorized users who access the mobile app under your administration, and you can create multiple user accounts. The API allows you to create, retrieve, update, and delete app users and manage which services they can access.

### Database Management

A Database is a repository of barcode values against which scans are validated, optionally displaying specific responses upon scanning. You can use the API to add, delete and edit individual database values, along with their associated response text and validation status. Databases can be populated by uploading CSV files or inserting/updating values individually or in bulk (up to 100 values per request). Multiple services can use the same database, but each service can only be linked to one database.

### Scan Records Retrieval

The Scans Retrieve API allows you to auto-fetch, modify, and insert scan records into third-party databases. You can filter scan records by service, user, date range, barcode value, and other criteria. Scan records include metadata such as who scanned, what was scanned, timestamps, GPS coordinates, and associated question answers.

### Questions (Data Collection Forms)

The "Questions" feature allows you to create prompts for app users to answer and submit alongside their scans. Questions can be answered through various inputs including text, scans, dropdowns, photos, signatures, and GPS locations. The API supports creating and managing these question definitions. Session questions can be configured to ask once and submit with each subsequent scan.

### Barcode Generation

Any value in a database uploaded to CodeREADr can be generated into a barcode. The API can generate QR codes and PDF417 barcodes with configurable size (1–10, in 50px increments).

### Postback URL / Direct Scan to URL (DSU)

A Postback URL enables seamless data exchange between the CodeREADr app and your designated server — every barcode scan is immediately sent via an HTTP POST request to a URL you specify. Your server can respond with validation results displayed in the app. With DSU, all scan records are posted directly to your server from the barcode scanner, and no scan records are sent to CodeREADr's servers. A "Receiver Only" mode allows CodeREADr to act as a conduit, forwarding scans without requiring your server to respond.

### Device Management

The API supports managing devices associated with your account, including configuring kiosk mode settings for dedicated scanning terminals.

## Events

CodeREADr supports real-time scan data forwarding through its **Postback URL** mechanism, which functions as a webhook system.

### Scan Postback (Webhook)

When a barcode is scanned, the app sends an HTTP POST request to your server, including data such as the scanned barcode value. The POST includes key-value pairs with scan metadata (barcode value, user, timestamp, service ID, device info, GPS data, and question answers). Two modes are available:

- **Full Postback**: Your server receives the scan and must respond with an XML result (valid/invalid) that is displayed to the app user in real-time.
- **Receiver Only**: CodeREADr's server acts as a conduit, records all transactions, and forwards scan data to your server. Server responses are optional.

Configuration is done per-service through the service's advanced settings by specifying the destination URL. Custom HTTP headers are not currently supported, but a custom key can be appended as a query parameter to the URL for verification purposes.
