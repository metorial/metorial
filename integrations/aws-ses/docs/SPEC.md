# Slates Specification for AWS SES

## Overview

Amazon Simple Email Service (SES) is a cloud-based email sending service that allows businesses and developers to send marketing, transactional, and notification emails. Amazon SES is an Amazon Web Services service that you can use to send email messages to your customers. SESv2 enables rich email capabilities like template management, list subscription handling, and deliverability reporting.

## Authentication

AWS SES uses standard AWS authentication mechanisms. All API requests must be signed using **AWS Signature Version 4 (SigV4)**.

**Required Credentials:**

- **AWS Access Key ID** and **AWS Secret Access Key**
- Optionally, an **AWS Session Token** for temporary credentials (e.g., when using AWS STS or IAM roles)

**Region:**

- The Amazon SES API v2 is available in several AWS Regions and it provides an endpoint for each of these Regions. You must specify the AWS Region when making API calls (e.g., `us-east-1`, `eu-west-1`).

**API Endpoint Format:**

- `https://email.{region}.amazonaws.com` — requests are made to the regional SES endpoint.

**Authentication Flow:**

1. Obtain an IAM user or role with appropriate SES permissions (e.g., `ses:SendEmail`, `ses:GetAccount`).
2. Use the Access Key ID and Secret Access Key to sign each API request using the SigV4 signing process.
3. Alternatively, use an AWS SDK which handles signing automatically.

**SMTP Authentication:**

- SES also supports sending email via SMTP. SMTP credentials are derived from IAM credentials but are distinct — you must generate SMTP credentials from the SES console or convert IAM credentials using a specific algorithm. The SMTP endpoint follows the format `email-smtp.{region}.amazonaws.com` on port 587 (STARTTLS) or 465 (TLS Wrapper).

## Features

### Email Sending

Send emails in two modes: **Formatted** (provide From, To, subject, and body — SES handles formatting) or **Raw** (manually compose the full MIME message for complete control over headers and content). Supports sending to multiple recipients with To, Cc, and Bcc fields. Emails can also be sent via SMTP.

### Email Templates

Create and manage reusable email templates with placeholder variables for personalization. SESv2 enables template management, including creating, updating, listing, and deleting templates. Bulk email sending is supported using templates with per-recipient replacement data.

### Contact Lists and Subscription Management

The SESv2 API includes several new actions related to list and subscription management. Create and manage contact lists, add or remove contacts, and manage topic-based subscription preferences. This enables compliance with unsubscribe requirements from major email providers.

### Identity Management

Verify and manage sending identities (email addresses and domains). Configure DKIM authentication for domains using either Easy DKIM (AWS-managed) or Bring Your Own DKIM (BYODKIM). Create sending authorization policies for identities to allow other AWS accounts to send on your behalf.

### Configuration Sets

Configuration sets are groups of rules that you can apply to the emails that you send. You apply a configuration set to an email by specifying its name when you call the API. All rules in that configuration set are applied to the email. Configuration sets control delivery options, reputation monitoring, tracking options, and suppression behavior.

### Suppression List Management

The account-level suppression list allows customers to create and control their own suppression list and manage their reputation. Addresses can be automatically suppressed on COMPLAINT or BOUNCE events. Supports individual and bulk add/remove operations.

### Dedicated IP Addresses

Grouping dedicated IPs together in a pool makes them easier to manage. A common scenario is to create one pool for marketing communications and another for transactional emails, so sender reputation is isolated. Two modes are available: **Standard** (manually managed) and **Managed** (AWS handles warmup, scaling, and ISP-specific optimization automatically).

### Virtual Deliverability Manager (VDM)

The SES Virtual Deliverability Manager provides insights into your sending and delivery data. VDM provides near-realtime advice on how to fix issues negatively affecting your delivery success rate and reputation. Includes dashboard metrics and guardian features for proactive deliverability management.

### Sending Statistics and Account Management

Retrieve account-level sending statistics, quotas, and reputation metrics. View delivery, bounce, and complaint rates. Check whether the account is still in the SES sandbox (which restricts sending to verified addresses only).

### Email Receiving (v1 API only)

Customers with applications that receive email using SESv1 API's CreateReceiptFilter, CreateReceiptRule or CreateReceiptRuleSet actions must continue using the SESv1 API client for these actions. Email receiving allows you to define rules for processing inbound emails, including filtering by IP address, and routing to S3, Lambda, SNS, or other destinations.

## Events

SES supports event publishing through **Configuration Sets** with **Event Destinations**. You can set up Amazon SES to publish email sending events to Amazon CloudWatch, Amazon Data Firehose, Amazon Pinpoint, Amazon Simple Notification Service, or Amazon EventBridge based on characteristics that you define.

To receive events externally (e.g., via webhook), you configure an SNS topic as the event destination and then subscribe your HTTP/S endpoint to that SNS topic.

### Email Sending Events

You can track several types of email sending events, including sends, deliveries, opens, clicks, bounces, complaints, rejections, rendering failures, and delivery delays.

The trackable event types are:

- **Send** — The send request was accepted and SES will attempt delivery.
- **Delivery** — Amazon SES successfully delivered the email to the recipient's mail server.
- **Bounce** — A hard bounce that the recipient's mail server permanently rejected the email.
- **Complaint** — The email was successfully delivered to the recipient's mail server, but the recipient marked it as spam.
- **Reject** — Amazon SES accepted the email, but determined that it contained a virus and didn't attempt to deliver it.
- **Delivery Delay** — The email couldn't be delivered due to a temporary issue, such as the recipient's inbox being full or a transient server issue.
- **Open** — The recipient opened the email.
- **Click** — The recipient clicked a link in the email.
- **Rendering Failure** — The email could not be sent due to a template rendering issue.
- **Subscription** — The email was successfully delivered, but the recipient updated subscription preferences by clicking List-Unsubscribe or the unsubscribe link.

**Configuration:**

- Events are configured per configuration set by creating event destinations.
- You first set up one or more configuration sets. A configuration set specifies where to publish your events and which events to publish.
- You can select which event types to publish to each destination.
- Message tags can be used to categorize emails for filtering and analysis within event destinations.
