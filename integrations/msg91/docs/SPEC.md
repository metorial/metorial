# Slates Specification for Msg91

## Overview

MSG91 is a CPaaS (Communications Platform as a Service) platform that helps users communicate with their users on multiple channels, providing secure and robust APIs and ready-to-use tools. It supports SMS, Email, WhatsApp, Voice, and RCS messaging channels, along with OTP verification, contact management (Segmento), campaign automation, and a customer support tool (Hello).

## Authentication

MSG91 uses **API Key (Authkey)** authentication.

An authentication key (Authkey), also known as an API key or access token, is a unique identifier or code that is used to authenticate and authorize requests made to the API. When making API requests, the authentication key is usually included in the request headers or as a query parameter.

**How to obtain the Authkey:**

- Log in to the MSG91 panel and select the Authkey option from the username dropdown.
- A new authentication key will be created and there will be an option to copy it.

**How to use the Authkey:**

- Pass it as a request header: `authkey: YOUR_AUTH_KEY`
- Or as a query parameter: `?authkey=YOUR_AUTH_KEY`

**Optional security:**

- MSG91 allows you to send messages only through whitelisted IPs via API. If API security is enabled and you try to send the SMS via any other IP, those requests will be rejected with error code 418.
- You can toggle the "Authkey status" option to disable your Authkey, and enable the same by toggling again.

## Features

### SMS Messaging

Send transactional and promotional SMS messages using pre-approved templates (flows). Messages support variable substitution for personalization (e.g., customer name, order details). SMS can be scheduled for a specific time by using the `send_at` parameter in the API request. Supports international messaging, flash SMS, Unicode content, and URL shortening. SMS logs and analytics are available via API.

### OTP Verification

A dedicated OTP service that handles generating, sending, resending, and verifying one-time passwords. OTP can be resent via "text" or "voice" methods when previous attempts fail. OTP length can be configured between 4 and 9 digits. An embeddable OTP Widget is also available that wraps the send, resend, and verify flow into a single integration.

### Email

Send transactional emails via API or SMTP. Supports HTML templates with variable mapping (Handlebars), attachments, email address validation, and domain verification (SPF, DKIM, MX). Templates can be created and managed via API. Email logs are available for tracking.

### WhatsApp Messaging

Send template-based WhatsApp messages, including interactive messages with buttons, lists, locations, and product catalogs (single and multiple). Interactive WhatsApp messages support headers, body text, footers, and buttons with titles and IDs. Also supports WhatsApp voice calls and payment links. Requires WhatsApp Business number onboarding through Meta. Inbound message handling is supported.

### Voice

Send voice SMS (text-to-speech), execute IVR/flow calls to numbers, and initiate click-to-call (two-way call) sessions. Voice templates can be created and managed. Voice logs are available, and agent/SIP/VPN credentials can be retrieved for telephony integration.

### RCS Messaging

Send Rich Communication Services messages with various content types: text, media, rich cards, carousels (including video), suggested replies, dial actions, URLs, locations (share and view), and calendar events. Templates can be created and managed via API.

### Campaign Management

Launch multi-channel campaigns that can send messages across SMS, WhatsApp, Email, and other configured channels through a unified Campaign API. Campaigns support variable mapping, scheduling, retry logic, and segment-based targeting.

### Contact Management (Segmento)

Create, update, search, and delete contacts. Manage phonebook fields and group contacts into segments. Track user events and user journeys. Supports product catalog management and retrieval of failed events. Contacts can be imported via CSV or managed via API.

### Subaccount Management

Add and manage client subaccounts under a reseller account structure.

## Events

At MSG91, you can add your webhook URL and receive real-time delivery reports for your SMS, WhatsApp, and RCS messages, as well as emails and voice calls. Event type filtering allows selecting the exact event types to monitor. Webhooks for all services (SMS, WhatsApp, RCS, Email, Voice) can be managed from a single interface.

### SMS Delivery Reports

Receive real-time delivery status updates for sent SMS messages. Statuses include Sent, Delivered, Failed, and Read. Custom tracking parameters (UUID, clientId) can be passed in the API and received back in the webhook payload. Webhooks are only triggered once MSG91 receives the final delivery status from the operator, not for pending messages.

### Email Delivery Reports

Receive delivery status updates for sent emails. Event types include:

- **On Request Received**: Triggers when an email request is sent from your account; does not include a delivery report.
- **On Report Received**: Provides real-time delivery reports, including success/failure status, its reason, and additional details.
- **On Opened/Unsubscribed/Clicked/Complaints Received**: Triggers when an action (such as Clicked, Opened, Unsubscribed, URL clicked) happens or if any complaint is received for your delivered email.
- To receive all event types, you must create a separate webhook for every event.

### Email Domain Status Changes

Monitor changes in your domain status and receive updates if your domain's status fluctuates. Reports SPF, DKIM, MX verification status and domain enabled/disabled status.

### Email Inbound Messages

Get data of incoming emails directly to your specified webhook URL.

### WhatsApp Delivery Reports

Receive delivery status updates for WhatsApp messages. Event types include:

- **On Outbound Request Received**: Triggers when an outbound message request is sent from your account. Includes "Sent" status logs, but does not share any data on delivery/failure status.
- **On Outbound Report Received**: Sends real-time delivery reports, including delivery status (Sent, Failed, Delivered, and Read) and other details for the outbound messages.
- **On Inbound Request Received**: Triggers when an inbound message request is submitted.
- **On Inbound Report Received**: Triggers when an inbound message request is successfully delivered.

### Voice Call Reports

Receive delivery reports for outbound and inbound voice calls. This event type provides real-time delivery reports including success/failure status and additional details. Includes caller ID, agent info, call direction, and failure reasons.

### RCS Delivery Reports

Receive delivery reports for RCS messages with status updates and message details.

### SendOTP Delivery Reports

Receive delivery reports for OTP messages sent via the SendOTP API, configured through the webhook system.

### Push Notification Reports

Receive delivery reports of push notifications. Event types include:

- **On Request Received**: Triggers when a request is sent from your account.
- **On Report Received**: Triggers to send real-time delivery reports of your push notifications, including the delivery status.
