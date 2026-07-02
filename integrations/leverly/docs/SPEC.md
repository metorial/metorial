Note: The first search returned results for "Lever" (an ATS), not "Leverly". Let me focus on Leverly specifically and look for their API documentation.The search results keep returning "Lever" (ATS) instead of "Leverly" (lead response software). Let me search more specifically for Leverly's API.Let me check what Zapier exposes for Leverly and look at their features page more closely.Now I have a good understanding of Leverly. Let me compile the specification based on all the information gathered. Key findings:

- Leverly (formerly Speak2Leads) is a lead response management tool that converts inbound leads into instant phone calls to sales reps
- Integration methods: HTTP Post, email parsing, Zapier, SOAP XML
- Authentication: Username + API Key (found in Leverly dashboard under 'integrations')
- Zapier triggers: "Call Finished"; Zapier actions: "Create Call"
- Lead data requires at minimum: phone number and account ID (name also mentioned as required)
- Can post back call results to CRM
- No public developer API documentation found - they primarily use HTTP Post inbound and Zapier
- Features include: AI call routing, call recording, multi-channel messaging, call flow management, reporting, branded calling

# Slates Specification for Leverly

## Overview

Leverly (formerly Speak2Leads) is a lead response management platform that converts inbound lead form data into instant phone calls to sales reps. It automates call prioritization, persistence with timed reattempts, and multi-channel follow-up (calls, SMS, email) to maximize lead contact rates. The platform also offers AI-powered call handling, appointment booking, and CRM syncing.

## Authentication

Leverly uses username and API key authentication. Your username and API key can be found in your Leverly dashboard under "Integrations."

When integrating via Zapier or direct HTTP Post, the API key and username are used to authenticate requests. There is no publicly documented OAuth flow or token-based authentication beyond this mechanism.

To authenticate:

- **Username**: Your Leverly account username
- **API Key**: Generated from the Leverly dashboard's integrations section

There is no publicly available standalone REST API documentation. Integrations are primarily done via:

1. Direct HTTP Post to Leverly's endpoint (with credentials)
2. Zapier integration using the username/API key pair
3. Email-based lead ingestion by adding your unique Leverly account email address to your lead distribution list, with Leverly's parsing engine extracting the needed data.
4. SOAP XML post for platforms like Salesforce or Microsoft Dynamics.

## Features

### Lead Posting / Call Creation

Submit lead data to Leverly to initiate automated call sequences to your sales team. Leverly works when it receives a lead name and phone number. You can post other fields for reporting purposes like lead source. At a minimum, you need to provide a phone number and your account ID.

- Leads can be submitted via HTTP Post, Zapier ("Create Call" action), email parsing, or SOAP XML.
- The software converts inbound form data from text to speech and delivers the info to your sales rep via a phone call.

### Automated Call Persistence

Leverly automates the call intervals and the priority of each lead to help reps increase their connection rates. Leverly will attempt to connect you up to 6 times.

- Call reattempts are automatically scheduled at optimized intervals.
- Leads are prioritized in order of likelihood to connect.

### Multi-Channel Messaging

You can add automated multi-channel messaging to improve contact rates. The mix of voicemails, text messages, and emails between call attempts can boost connections.

- SMS, email, and voicemail drops can be triggered based on call results and configurable rules.

### AI Call Handling

AI Call Insights powers smoother, smarter interactions. It listens, learns, and extracts insights in real-time. Leverly AI can answer inbound calls, qualify leads, book appointments, take messages, or route to your team. It can be configured to handle all calls, only when reps are busy, or after-hours only.

### Call Routing and Distribution

You can manage call flow and lead distribution by Group—a Group of 1 or Group of 100. Create all routing rules and schedules for each. Options include round-robin, simultaneous ring, or rules-based routing.

### Call Recording and Reporting

Get detailed analysis of response speeds, close rates, call durations and more. Get KPIs for speed, persistence and connections by rep. See calls in the queue parked for reattempts, and get a snapshot of live calls.

- All calls can be recorded.
- See which lead sources generate the best quality leads.

### CRM Result Posting

Leverly will receive a post as soon as a lead hits your CRM. You also have the option for Leverly to post back the call results to your CRM. Outcomes sync to Salesforce, HubSpot, GoHighLevel, and other CRMs.

### Branded Calling

Branded Calling boosts call acceptance rates by ensuring your calls are recognized and trusted.

## Events

Leverly exposes a limited event model primarily through its Zapier integration:

### Call Finished

Triggers when a call is finished. This event fires after a call sequence with a lead completes and can be used to push call results (e.g., connection status, call duration, outcome) to external systems like CRMs, spreadsheets, or notification tools.

Leverly does not appear to offer a native webhook registration API or a self-service webhook configuration mechanism outside of Zapier. Call result data can also be posted back to a CRM via direct HTTP Post configuration managed within the Leverly dashboard.
