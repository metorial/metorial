Now I have sufficient information to write the specification. Let me compile it.

# Slates Specification for Postalytics

## Overview

Postalytics is a direct mail automation platform that enables users to programmatically create, send, and track personalized postcards, letters, and self-mailers to addresses in the United States and Canada. It provides template design, contact list management, campaign orchestration, delivery tracking via USPS Intelligent Mail barcodes, and online response tracking through personalized URLs (pURLs) and QR codes.

## Authentication

Postalytics uses **API Key authentication** with HTTP Basic Auth.

- To obtain your API key, log in to your Postalytics account, click your profile icon > Connect > API Keys, and copy the API key.
- Requests made to the API are protected with HTTP Basic authentication. The API key is used as the credential in the Basic Auth header.
- Postalytics provides mock and dev environments in addition to production, so when connecting you may need to specify which environment to use.
- For multi-tenant (Agency Edition) usage, sub-accounts can be created via API, each with unique keys, dashboards, and permissions.

## Features

### Account Management

Create, retrieve, update, and manage accounts programmatically. In multi-tenant scenarios, you can spin up fully isolated sub-accounts programmatically, with separate branding, billing, and analytics for each customer.

### Template Management

Design and manage mail piece templates using HTML or image-based designs. Templates support variable data (merge fields), variable logic (conditional content via IF/THEN rules), and variable images for personalization. Supported formats include postcards (multiple sizes), letters, bi-fold and tri-fold self-mailers, and custom envelopes.

### Contact List Management

Add, update, retrieve, and manage lists and contacts. CASS and NCOA address validation runs automatically; invalid addresses never print. You can also create and manage suppression lists to exclude specific contacts from mailings.

### Campaign Management

Create, manage, and track the mailing and response for automated direct mail campaigns. Postalytics supports multiple campaign types:

- **Smart Send Campaigns**: List-based batch mailings with optional multi-touch mail drops.
- **Triggered Drip Campaigns**: Individual mail pieces triggered by events from CRMs, webhooks, or other automation tools. Campaigns can be set to Test Mode to verify webhook workflows without actually sending mail.
- **Automated File Campaigns (AFC)**: Batch campaigns initiated by uploading CSV files via the UI or SFTP.

### Campaign Flows

Launch and manage multi-touch Flows and easily enroll/unenroll contacts to/from the flow. Flows allow building multi-step direct mail sequences with timing and branching logic.

### Sending Mail

Send personalized, automated postcards, letters, and self-mailers anywhere in the United States and Canada. Individual mailpieces can be triggered via the `/send` endpoint or contacts can be enrolled into flows via the `/flow` endpoint.

### Delivery and Response Tracking

The platform uses USPS Intelligent Mail barcodes to receive real-time delivery scans, associating each piece of mail back to a contact record so you know exactly where your mail is in the delivery process. You can retrieve all events for campaigns and contacts in any campaign. Online response tracking is available through personalized URLs (pURLs) and QR codes included in mail templates.

### Login Links

Programmatically create authenticated links to auto-login users from your third-party application into the Postalytics UI, useful for multi-tenant or embedded scenarios.

### Express Windows

Express Windows are embeddable, white-labeled Postalytics components that handle the complex, visual workflows of direct mail such as template building, campaign wizards, and analytics dashboards. These can be embedded into third-party applications.

## Events

Postalytics supports **outgoing webhooks** that notify your application about events occurring in direct mail campaigns. Webhooks notify you about events that happen in your direct mail campaigns, and you can set up different endpoints for each campaign.

### Mail Lifecycle Events

Webhooks are sent for the following event types throughout the mail lifecycle:

- **Created** – A mail piece has been created in the system.
- **Addressed** – The recipient address has been processed. If the address was corrected by CASS or NCOA validation, the updated address is included.
- **Printed** – The mail piece has been printed.
- **Mailed** – The mail piece has entered the postal system.
- **In Transit** – The mail piece is in transit through the postal network.
- **In Local Area** – The mail piece has arrived at the local delivery area.
- **Processed for Delivery** – The mail piece has been processed for final delivery.
- **Re-Routed** – The mail piece has been re-routed (e.g., forwarded).
- **Return to Sender** – The mail piece is being returned to sender.

### Online Response Events

- **pURL Opened** – The recipient visited their personalized URL.
- **pURL Completed** – The recipient completed the desired action on the personalized landing page.

Each webhook payload includes recipient information, mail piece details, event timestamps, expected delivery dates, the contact ID for matching back to internal data, and any variable data fields from the contact record. Webhooks require a Pro plan or higher.
