Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Convolo AI

## Overview

Convolo AI (now also known as Brightcall.ai) is an AI-powered communications platform for sales acceleration. It provides features like multi-line dialers, lead routing, and automated follow-up systems. The platform has two core products: Speed To Lead™ for inbound sales and lead generation, and Multi Line Dialer™ for outbound sales.

## Authentication

Convolo AI uses API keys for authentication. Two credentials are required:

- **Widget Key**: Identifies the specific widget (call configuration) being used. Found in the Convolo dashboard under Convolo Leads > Widgets > Settings, on the Main tab.
- **API Key**: Found on the Integrations tab of the widget settings. If the API key field is empty, click the "Generate API KEY" button.

Both keys are passed as query parameters or in the request body for each API call. For the **Speed To Lead™** API, the base URL is `https://app.convolo.ai/rest/v1/ext/add_call_api/` (also available at `https://app.brightcall.ai/rest/v1/ext/add_call_api/`), with `widget_key` and `api_key` as parameters.

For the **Power Dialer™** API, a separate API key is used as a query parameter (`api-key`) with the base URL `https://api.dialer.brightcall.ai/api/v3/`.

For the **Speed To Lead™ reporting** API, the API key is passed as a query parameter to the endpoint `https://api.leads.convolo.ai/api/v2/`.

## Features

### Trigger Calls to Leads (Speed To Lead™)

Initiate a phone call to a lead and establish the connection with the first available agent. This is the primary API action for the Speed To Lead product.

- **Required parameter**: `lc_number` — the lead's phone number.
- **Optional parameters**: Lead name (`lc_param_name`), email (`lc_param_email`), message, a secondary phone number (`lc_number_2`), country, and custom agent assignments (`lc_param_agent01name`, `lc_param_agent01phone`, etc.).
- Agents can be dynamically defined via the API to override the regular call queue and send calls to specific agents.
- Supports both GET and POST request methods.

### Retrieve Speed To Lead Call Reports

Retrieve a list of past calls and their details from the Speed To Lead product, including call status, duration, agent information, lead information, recording links, and custom parameters.

- Filter by date range, widget IDs, call status (answered, no answer, missed), lead phone number, agent, widget URL, talk time, and answer time.
- Response includes aggregate statistics such as total calls, answered calls, missed calls, and time ranges.

### Retrieve Dialer Call Reports & Statistics

Calls and call statistics data can be retrieved from the Power Dialer product.

- Filter by date range, call types (inbound, outbound, internal), call states (answered, unanswered, failed), agents, teams, projects, tags, outcomes, talk time, and answer time.
- Response includes AI-generated call recording summaries and titles (if enabled).
- A separate statistics endpoint provides aggregated metrics broken down by call direction (all, inbound, outbound, internal) including success/fail counts, talk times, and AI talk time.

## Events

Convolo AI supports webhooks for both its Speed To Lead™ and Power Dialer™ products.

### Speed To Lead™ Webhook Events

Webhooks are configured per widget under the Integrations tab. There are two types of webhook events: those sent when a call has started (`start_call`) and when a call is completed (`end_call`).

- **start_call**: Sent when a call to a lead is initiated. Includes lead details and custom parameters.
- **end_call**: Sent when a call is completed. Includes call status, duration, agent and lead information, recording link, and custom parameters.

### Power Dialer™ Webhook Events

There are different events for each call: "callStarted", "callRinging", "callAnswered", "callEnded", and "webphoneSummary".

- **callStarted**: Sent when a call is initiated, with CRM data shown to the agent.
- **callRinging**: Sent when the phone is ringing, with CRM data shown to the agent. You can respond with CRM contact data to display to the agent.
- **callAnswered**: Sent when the call is answered, but often not processed.
- **callEnded**: Sent when the call ends, and call data is sent to the CRM. Includes call duration, caller ID, and other call details.
- **webphoneSummary**: Sent after the call ends and the agent selects the call outcome, but it might not be triggered if no outcome is chosen. This event sends outcome details to the CRM. Includes AI summary and transcript if enabled.
- **SMS events**: Can optionally be enabled to also receive webhook notifications for SMS events.

Dialer webhooks can be configured with a "Use routes" option to send each event type to a separate URL endpoint, or all events to a single endpoint with an `eventType` parameter. It is not possible to subscribe to only one event type; all events are pushed to the specified endpoint and must be filtered on the receiving side. Multiple webhook connectors can be configured simultaneously.
