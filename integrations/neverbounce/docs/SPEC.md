Now let me check the job callbacks documentation to understand webhook/event support better.The page content was minimal. Let me search for more details on job callbacks.I now have enough information to write the specification.

# Slates Specification for NeverBounce

## Overview

NeverBounce is an email verification and list cleaning service. It provides an API to verify individual email addresses in real time and to validate bulk email lists, returning results such as valid, invalid, disposable, catchall, or unknown. NeverBounce is an email verification service that improves deliverability and helps businesses adhere to strict deliverability guidelines.

## Authentication

NeverBounce uses API key authentication. Starting with Version 4 of the API, accounts can have multiple unique API keys. These API keys are attached to Custom Integrations, allowing advanced reporting and advanced settings.

To obtain an API key:

1. Log into your NeverBounce account and create a new Custom Integration App. After creation, you'll be taken to the app's overview page, where you'll find your API key. This key will be used to authenticate your requests to the API.

2. The API key will look like: `secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. You'll use this key to authenticate your requests to the NeverBounce API.

The API key is passed as a `key` query parameter or in the request body for each API call. The base URL is `https://api.neverbounce.com/v4.2/`.

**Important:** The API username and secret key used to authenticate V3 API requests will not work to authenticate V4 API requests. If you are attempting to authenticate with the 8-character username or 12–16-character secret key, the request will return an auth_failure error.

## Features

### Single Email Verification

Verify an individual email address in real time. A common scenario for using the single endpoint is to verify emails at the point of entry in web-forms; helping to keep your user base or newsletter list clean. The result includes a verification status (valid, invalid, disposable, catchall, or unknown), flags (e.g., `has_dns`, `has_dns_mx`), and a suggested correction if applicable.

- **Parameters:** `address_info` returns additional metadata about the email's host, and `credits_info` returns remaining credit balance information.
- At the point of entry, it is suggested to allow valid, catchall, and unknown emails to proceed, while blocking disposable and invalid emails. Unknown results may occur more frequently with single verification than with bulk verification.

### Bulk Email List Verification (Jobs)

With the API, you can verify existing contact lists without uploading to the dashboard. Verifying a list through the API is similar to the dashboard workflow. Once received, NeverBounce begins indexing and deduplicating followed by the verification process.

- **Input methods:** Supply email data directly in the request body, or provide a remote URL pointing to a CSV file.
- **Job controls:** `auto_parse` controls whether indexing starts automatically; `auto_start` controls whether verification begins after parsing. These can be disabled for manual control of the pipeline.
- The `allow_manual_review` option lets users opt into manual review when creating API jobs. If enabled, a job may take up to 1 business day to be released if it falls into the manual review queue.
- **Results:** Once a job completes, results can be retrieved or downloaded. You can also check real-time job status and progress.

### Free List Analysis

NeverBounce offers a free analysis feature to assess your list's overall health. This provides an estimated bounce rate and helps you decide if further action is required. To get an estimate, create a job with the `run_sample` parameter.

### Job Management

Search, list, and delete existing verification jobs. You can use the status endpoint to retrieve real-time statistics about a bulk job in progress. Results can be downloaded once the job has completed.

### Account Information

Returns the account's current credit balance as well as job counts indicating the number of jobs currently in the account.

### Proof of Entry (POE) Confirmation

This provides an extra layer of protection by confirming that the email you received was verified by NeverBounce. It is used to validate results from the JavaScript Widget on the server side, confirming that widget verification data has not been tampered with. Requires the email, result, transaction ID, and confirmation token from the widget verification.

## Events

### Job Callbacks

Job callbacks allow your application to react to status changes to your NeverBounce jobs. During job creation you can specify a URL for us to send these callbacks to with the `callback_url`.

- To enable callbacks, supply an accessible URL in the `callback_url` parameter. This URL should start with either `http://` or `https://` and be accessible over the internet. You can supply basic authentication credentials directly in the URL. You can also specify headers to include in the callback requests with the `callback_headers` parameter, which can be used to set an authorization token or internal reference for the job.
- Callbacks notify your application of job status changes throughout the verification lifecycle (e.g., job completed, job failed, under review).
