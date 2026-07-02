Let me get the full API documentation page for more details on all the endpoints and features.Now I have comprehensive information about the DialMyCalls API. Let me compile the specification.

# Slates Specification for Dialmycalls

## Overview

DialMyCalls is a mass notification platform that enables sending voice call broadcasts, SMS/MMS text message broadcasts, and email messages to groups of contacts. It serves businesses, schools, churches, emergency services, and other organizations that need to reach large audiences with automated phone calls and text messages. The service is available in the US and Canada.

## Authentication

All API requests require authentication via HTTP basic auth. The API key must be passed as the username in the endpoint URL in the following format: `https://{ApiKey}@api.dialmycalls.com/2.0/`.

Alternatively, the API key can be passed as an HTTP header with the parameter name `X-Auth-ApiKey`.

Every DialMyCalls account has a unique API key, which can be found under API Info in the account settings. From the DialMyCalls dashboard, click on "My Account" in the top-right corner and then click on "Integrations" from the drop-down menu to find the key.

When using HTTP basic auth, the API key is the username and the password can be any arbitrary value (e.g., `x`).

**Base URL:** `https://api.dialmycalls.com/2.0/`

## Features

### Contact Management

Create, update, delete, and list contacts in your DialMyCalls account. Each contact can have a phone number, name, email, phone extension, and custom data. Contacts can be organized into groups for targeted broadcasting.

### Contact Groups

Create and manage groups of contacts. Groups allow you to organize contacts for efficient broadcast targeting. Contacts can belong to multiple groups.

### Voice Call Broadcasting

Create outgoing call broadcasts to a list of contacts. Calls require a caller ID and a recording (the message to play). Key options include:

- Scheduling broadcasts for a specific time or sending immediately.
- Answering machine detection (AMD) with separate recordings for live answers vs. voicemail.
- Add-on features: push-to-talk (connect caller to a live person), push-to-record (let recipient leave a message), telephone polling, push-to-opt-out, and push-to-listen-again.
- Optionally sending an email alongside the call.
- Retrieving call recipients with delivery status (live answer, voicemail, busy, no answer, etc.).
- Canceling scheduled calls.

### SMS/MMS Text Broadcasting

Create outgoing text message broadcasts to a list of contacts. Text broadcasts require a keyword ID and support up to 10 messages per broadcast. Options include:

- Scheduling or sending immediately.
- SMS concatenation (combining multiple SMS segments into one message on the recipient's device).
- Using shortcodes for sending.
- Optionally sending an email alongside the text.
- Retrieving text recipients with delivery status.
- Canceling scheduled texts.

### Incoming Text Messages

Retrieve and manage inbound text messages received on your vanity numbers or keywords. Each incoming text includes the sender's number, recipient number, and message content.

### Recordings Management

Create and manage audio recordings used for voice call broadcasts. Three creation methods are supported:

- **Text-to-Speech:** Generate a recording by providing text, selecting a gender (M/F), and language (English or Spanish).
- **URL:** Upload a recording from an MP3 or WAV file URL.
- **Phone:** Record a message by receiving a phone call and speaking the message.

### Caller ID Management

Add, verify, update, and delete caller IDs used as the outgoing number for call broadcasts. Some caller IDs require a phone verification process where a PIN is delivered via call and must be confirmed through the API.

### Vanity Numbers

Manage dedicated vanity phone numbers associated with your account. Vanity numbers support configurable call options including voicemail, push-to-talk, opt-in, and message repeat. You can also retrieve and manage voicemails left on vanity numbers.

### Keywords

Manage SMS keywords associated with your account. Keywords are used for text broadcasting and allow contacts to opt in/out by texting commands (START/STOP) to your vanity number.

### Do Not Contact List

Retrieve the list of phone numbers that have opted out of receiving calls or texts. Each entry specifies whether the opt-out is for calls, texts, or both.

### Access Accounts (Sub-Accounts)

Create and manage sub-accounts that can schedule broadcasts on behalf of the main account. Each access account has its own email, password, and name.

### Account Information

Retrieve account details including available credits balance.

## Events

The provider does not support events. The DialMyCalls API (v2.0) does not offer webhooks or event subscription mechanisms.
