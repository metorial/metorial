# Slates Specification for Dromo

## Overview

Dromo is a data import platform that enables applications to accept and process CSV, Excel, TSV, and other spreadsheet file uploads. It is a spreadsheet importer that integrates with web products, helping users match columns, correct errors, perform complex validations, transform values, and upload clean, formatted data. It offers both an embeddable front-end widget and a headless (server-side) API for automated imports.

## Authentication

Dromo uses API keys for authentication. There are two types of keys:

- **Front-end License Key**: Used when embedding the Dromo importer widget in a web application. You need a free license key, which you can get by registering for an account. This key is passed as a `licenseKey` prop to the embedded component.

- **Back-end API Key (License Key)**: Used for REST API and Headless API calls. API requests are authenticated by passing the key in the `X-Dromo-License-Key` header, with requests sent to the base URL `https://app.dromo.io/api/v1/`.

Both keys can be found in the Dromo dashboard. No OAuth flow is required.

## Features

### Headless Imports

The headless API allows running imports entirely via backend calls with no user interface — you programmatically send a file or data payload, specify which schema to apply, and Dromo returns cleaned data via API if everything is valid. If there are issues (e.g., unmapped columns or validation errors), Dromo provides a special review URL where a user can manually resolve the problems.

- Requires specifying a `schema_id` and `original_filename` when creating the import.
- Files can be fed from anywhere — an SFTP server, an internal data pipeline, AWS S3, etc.
- The Headless API is a premium add-on.

### Import Data Retrieval

Dromo's APIs provide programmatic access to uploads and schemas, enabling automated workflows. You can:

- List all completed imports (uploads).
- Retrieve the cleaned result data for a specific import by its ID.
- Retrieve import metadata (filename, user info, timestamps, row counts, download URLs).

### Schema Management

To use Dromo, you define a schema — a list of fields to import. These fields are matched to columns during the import process. You can add validation rules and data transformation hooks to match your data requirements.

- Schemas can be created via code (SDK) or using the no-code Schema Studio in the dashboard.
- Supported field types include percentage, currency, phone number, URL, and advanced text fields with automatic type detection.

### Data Validation and Transformation

Dromo provides hooks (custom functions) to run custom validations or transformations on each row (or in bulk) during the import process.

- Column hooks and step hooks allow custom logic at different stages (upload, review, post-hooks).
- The `invalidDataBehavior` option supports three modes: remove invalid rows, include them with error flags, or block submission until resolved.
- Dromo supports asynchronous validation, allowing the importer to call your backend during the import process.

### Data Export

Dromo supports exporting data as CSV, Excel, JSON, and more, with automated scheduled exports and custom reusable export templates.

### Third-Party Integrations

Dromo integrates with services across your existing stack, from Google Drive and Microsoft OneDrive to Slack and HubSpot, and hundreds of others. You can pass import results to services like Google Drive, OneDrive, Dropbox, Slack, and others via Zapier.

## Events

Dromo supports webhooks to get notified when users complete an import. Dromo provides two kinds of webhooks: managed webhooks and basic webhooks.

- **Managed webhooks** are configured in the Dromo dashboard and can be applied to multiple schemas. A Development Mode toggle controls whether the webhook fires for development or production imports. You can filter by Import Identifiers to control which schemas trigger the webhook.
- **Basic webhooks** are configured dynamically per import by setting a `webhookUrl` in the import settings. They are triggered on import completion and deliver only the `uploadId` via POST request in URL-encoded form format.

### Import Completed

- **Event**: `import_completed`
- Triggered when any import (embedded or headless) is completed successfully. Includes import ID, filename, user info, status, row count, and whether data is available for retrieval.

### Headless Import Needs Review

- **Event**: `headless_import_needs_review`
- Triggered when a headless import enters the "needs review" state (e.g., columns couldn't be auto-mapped or validation errors require human intervention).

### Headless Import Failed

- **Event**: `headless_import_failed`
- Triggered when a headless import encounters an unrecoverable error and goes to the failed state.
