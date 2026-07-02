# <img src="https://provider-logos.metorial-cdn.com/deepgram-logo.svg" height="20"> Deepgram

Use Deepgram REST APIs for pre-recorded speech-to-text, text-to-speech, text intelligence, model discovery, project administration, usage, request troubleshooting, and billing reporting. Supports asynchronous processing via callbacks for transcription, speech synthesis, and text analysis.

## Tools

### Analyze Text

Analyze text for intelligence insights including sentiment analysis, topic detection, intent detection, custom topics or intents, and summarization. Enable one or more analysis features to extract value from text content such as transcripts, articles, or conversations.

### Create API Key

Create a new API key for a Deepgram project. The key value is only returned once at creation time.

### Create Temporary Token

Create a short-lived Deepgram JWT for client-side or temporary use with core voice APIs.

### Delete API Key

Permanently delete an API key from a Deepgram project.

### Delete Project

Permanently delete a Deepgram project.

### Delete Project Invitation

Delete a pending Deepgram project invitation by invitee email address.

### Get Balance

Get one Deepgram billing balance by ID.

### Get Balances

Get billing balance information for a Deepgram project. Returns available credits and balance details.

### Get Billing Breakdown

Get grouped billing metrics for a Deepgram project.

### Get Billing Fields

Get available billing filter fields for a Deepgram project.

### Get Member Scopes

Get the role/scopes for a specific Deepgram project member.

### Get Project

Get details of a specific Deepgram project including its name, company, and configuration.

### Get Project Model

Get metadata for a model available to a specific Deepgram project.

### Get Project Request

Get details for a single Deepgram request by request ID.

### Get Usage

Get usage data for a Deepgram project. Filter by date range, API key, tag, method (sync/async/streaming), or model. Useful for monitoring API consumption and billing.

### Get Usage Breakdown

Get grouped usage metrics for a Deepgram project.

### Get Usage Fields

Get available usage breakdown fields for a Deepgram project and optional date range.

### Get API Key

Get metadata for a specific Deepgram API key. Deepgram does not return the secret key value after creation.

### List API Keys

List all API keys for a Deepgram project. Returns key metadata including comments, scopes, tags, and expiration dates. Does not return the actual key values.

### List Project Invitations

List pending invitations for a Deepgram project.

### List Models

Query available Deepgram models and their metadata. Useful for discovering which models are available for transcription or text-to-speech and what languages they support.

### List Project Requests

List individual Deepgram API requests for a project. Useful for request-level troubleshooting, audit trails, and correlating tagged calls with usage.

### List Project Models

List public and project-specific Deepgram models available to a project.

### List Project Members

List all members of a Deepgram project. Returns member details including name, email, and permission scopes.

### List Projects

List all Deepgram projects accessible with the current API key. Returns project IDs, names, and company information.

### List Purchases

List purchase/order records for a Deepgram project.

### Remove Project Member

Remove a member from a Deepgram project.

### Send Project Invitation

Invite a user to join a Deepgram project by email.

### Text to Speech

Convert text into natural-sounding speech audio. Returns generated audio as a Slate attachment with structured metadata for MIME type, byte length, request ID, and attachment count.

### Transcribe Audio

Transcribe pre-recorded audio to text. Supports audio from a URL or raw audio data (base64-encoded). Provides options for model selection, language detection, speaker diarization, smart formatting, keyword/keyterm prompting, callbacks, and text intelligence features (summarization, topic detection, intent detection, sentiment analysis). Returns the full transcript with word-level timestamps and confidence scores.

### Update Member Scopes

Update a project member's role/scopes.

### Update Project

Update a Deepgram project's name.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
