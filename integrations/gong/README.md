# <img src="https://provider-logos.metorial-cdn.com/gong.png" height="20"> Gong

Access and analyze sales call recordings, transcripts, and conversation intelligence data. Retrieve call details including participants, topics, trackers, scorecards, and full transcripts with speaker labels. Upload and manage call recordings from external systems. Retrieve user activity statistics such as talk ratios and interaction metrics. Manage CRM data by uploading accounts, contacts, deals, and leads. List and manage Engage outreach automation flows, assign or unassign prospects, and override flow content for campaigns. Browse and manage the call library and folders. Push digital interaction events like content shares and views. Create, validate, and delete meetings. Handle data privacy operations including GDPR-compliant erasure of user data. Retrieve audit logs, tracker configurations, workspace details, and permission profiles. Receive webhook notifications when calls match configured automation rules.

## Tools

### Browse Library

Browse Gong's call library. Retrieve library folders and optionally list calls within a specific folder. Use to navigate and discover organized call recordings.

### Create Call

Create a Gong call record from an external recorder or telephony system. Provide call metadata and either a media download URL or upload media afterward with Add Call Media.

### Add Call Media

Upload a recording file for a Gong call created from an external recorder or telephony system.

### Lookup Privacy Data

Look up all Gong elements referencing a specific email address or phone number. Useful for GDPR data subject access requests (DSARs) to understand what data exists for a person.

### Get Call Details

Retrieve detailed/extensive data for specific calls by their IDs or date range. Returns rich data including participants, topics, trackers, AI brief, highlights, key points, interaction stats, and more. Use the **includeContent** and **includeInteraction** flags to control which data is returned.

### Get Call Transcripts

Retrieve full transcripts for Gong calls. Returns speaker-labeled, timestamped transcription data. Useful for NLP analysis, sentiment analysis, or reviewing conversation content.

### Get CRM Data

Retrieve CRM objects uploaded to Gong. Fetch specific CRM entities (accounts, contacts, deals, leads, or users) by their CRM IDs.

### Get CRM Metadata

Read Gong CRM API metadata: registered integrations, selected entity schema fields, or asynchronous CRM upload/delete request status.

### Get Scorecards

Retrieve scorecard answers from Gong. Returns answers for scorecards reviewed during a date range, for specific scorecards, or for specific reviewed users. Useful for tracking coaching quality and call evaluations.

### Get User Activity Stats

Retrieve aggregated activity statistics for Gong users over a date range. Returns metrics like calls hosted, attended, feedback given/received, and listening activity. Optionally retrieve **daily breakdowns** or **interaction stats** (talk ratio, longest monologue, etc.).

### Get User

Retrieve a specific Gong user by ID, including profile metadata and settings returned by Gong.

### Get Settings Definitions

Retrieve Gong settings definitions for keyword trackers and scorecards. Use this before requesting call details or scorecard stats when you need tracker or scorecard IDs and names.

### List Calls

Retrieve a list of calls from Gong filtered by date range. Returns basic call metadata including title, duration, direction, and timestamps. Use this for browsing calls or finding calls within a specific time window.

### List Users

Retrieve all Gong users in the organization. Returns user profile information including name, email, title, and activity status. Supports pagination and optionally includes avatar URLs.

### List Users By Filter

List Gong users with extensive filters, including user IDs and creation time ranges.

### List Workspaces

Retrieve all workspaces in the Gong organization. Workspaces are used to organize calls, users, and settings. Returns workspace IDs and names.

### List Engage Flows

Retrieve available Gong Engage flows and flow folders. Returns company flows, personal flows, and shared flows for a given user. Use to browse outreach automation sequences.

### Create Meeting

Create a new meeting in Gong. Define the meeting title, schedule, organizer, and attendees. The meeting will appear in Gong's meeting tracking.

### Update Meeting

Update an existing Gong meeting's time, title, organizer, invitees, or external ID.

### Manage Call User Access

Grant, revoke, or retrieve individual user access for Gong calls. This manages only access created through Gong's call user access API.

### Push Digital Interaction

Push digital interaction events into Gong's activity timeline. Supports events like content shares and content views, enabling external engagement data to appear alongside calls and emails in Gong.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
