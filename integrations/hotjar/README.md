# <img src="https://provider-logos.metorial-cdn.com/hotjar.png" height="20"> Hotjar

Export survey response data and manage user data for privacy compliance. List surveys for a site, retrieve survey responses, perform user lookups by email or user ID, and submit deletion requests for GDPR compliance. Receive real-time webhook notifications when new survey responses are created or new recordings matching a segment are captured.

## Tools

### Get Survey Responses

Retrieve responses for a specific Hotjar survey. Returns response data including answers, user metadata, device information, and sentiment analysis. Responses are sorted by creation date (newest first). Supports pagination for surveys with many responses.

### List Surveys

List surveys for a Hotjar site. Returns survey metadata including name, type, status, and optionally the survey questions. Supports pagination for sites with many surveys.

### User Lookup & Deletion

Look up or delete a user's data in Hotjar for GDPR and privacy compliance. Searches by email address and/or site-specific user IDs. Can either generate a data report (sent via email) or immediately delete all matching data.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
