# Slates Specification for SMS Alert

## Overview

SMS Alert (smsalert.co.in) is an Indian bulk SMS service provider by Cozy Vision Technologies that offers transactional and promotional SMS delivery via a REST API gateway. It provides transactional and promotional bulk SMS solutions to enterprises via its bulk SMS gateway. The API allows sending SMS messages through a REST API, along with OTP verification, contact management, and SMS scheduling capabilities.

## Authentication

SMS Alert supports two authentication methods:

### 1. API Key Authentication (Primary)

- An `apikey` parameter is passed as a query parameter on API requests, generated from the user's SMS Alert account.
- The API key is obtained from the SMS Alert dashboard at `https://smsalert.co.in/api`.
- Example: `https://www.smsalert.co.in/api/push.json?apikey=YOUR_API_KEY&sender=SENDERID&mobileno=8010551055&text=Hello`

### 2. Username and Password Authentication (Alternative)

- Authentication can also be done using a username and password instead of an API key.
- The username (`SMSALERT_USER`) and password (`SMSALERT_PWD`) of the SMS Alert account are used.

**Base URL:** `https://www.smsalert.co.in/api/`

All API responses are in JSON format. An account on SMS Alert is required; users can sign up for a free demo account to test the service, then purchase credits to use in their applications.

## Features

### Send SMS

Send individual or bulk SMS messages to one or multiple recipients. Messages can be sent to single numbers or comma-separated lists. Requires specifying a sender ID (assigned to your account), the recipient mobile number(s), and message text. Supports both transactional and promotional routes. Also supports XML-based push for sending different messages to different recipients in a single request.

### SMS Scheduling

Schedule SMS messages for future delivery by specifying a date and time (format: `YYYY-MM-DD HH:MM:SS`). Scheduled messages can be modified to change the delivery time or cancelled entirely. Cancelled scheduled messages have their credits refunded.

### OTP (One-Time Password)

Generate and validate OTPs via SMS for mobile number verification. The OTP template must include an `[otp]` tag, which supports configurable attributes: `length` (3–8 digits, default 4), `retry` (max send attempts, default 5), and `validity` (expiry in minutes, default 15). Multi-channel retry is available to ensure OTP delivery.

### Contact Management

Manage contacts organized in groups. Contacts can be created, edited, deleted, imported (via XML), and listed within groups. Supports sending SMS to entire groups at once.

### Group Management

Create, edit, delete, and list contact groups. Groups serve as reusable recipient lists for sending bulk SMS campaigns. Group names must not contain spaces.

### Template Management

Create, edit, delete, and list reusable SMS templates. Templates store pre-defined message content that can be used when composing SMS campaigns.

### Sender ID Management

List available sender IDs assigned to the account. Sender IDs appear as the sender name on recipient devices.

### Reports and Delivery Status

Retrieve sent SMS campaign logs with filtering options. Delivery reports can be obtained via two mechanisms:

- **Pull**: Query delivery status by batch ID to get per-recipient delivery status (e.g., DELIVRD, AWAITED-DLR).
- **Push (DLR URL)**: Specify a callback URL (`dlrurl`) when sending an SMS to receive delivery reports pushed to your endpoint.

### Short URL

Create and delete shortened URLs. Useful for including trackable links in SMS messages to stay within character limits.

### Account Management

Check credit balance (broken down by route, e.g., transactional, non-DND), update profile details, change password, and view available sender IDs.

## Events

SMS Alert supports delivery report callbacks (push DLR). When sending an SMS, you can provide a `dlrurl` parameter with a URL-encoded callback URL. SMS Alert will POST delivery status updates to that URL when the message delivery status changes (e.g., delivered, failed). You can also include a `reference` parameter to correlate delivery reports with your own identifiers.

### Delivery Report Callback

- Receives message delivery status updates pushed to your specified callback URL.
- Configured per-message by including the `dlrurl` parameter in the send SMS request.
- Includes details such as mobile number, message ID, and delivery status.

SMS Alert does not appear to support general-purpose webhook subscriptions or event subscriptions beyond per-message delivery report callbacks.
