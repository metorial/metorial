# <img src="https://provider-logos.metorial-cdn.com/vonage.png" height="20"> Vonage

Send and receive messages across SMS, MMS, WhatsApp, Facebook Messenger, Viber, and RCS channels. Make and receive voice calls, control call flow with IVR and speech recognition, and record conversations. Host real-time video sessions with screen sharing, archiving, and captions. Verify user identity via SMS, voice, email, WhatsApp, or silent authentication with automatic channel failover. Look up phone number intelligence including carrier, type, reachability, and SIM swap detection. Purchase and manage virtual phone numbers globally. Monitor message delivery, call events, and video session activity via webhooks. Manage subaccounts, transfer balances, and track usage across accounts.

## Tools

### Check Verification Code

Check a verification code submitted by a user against an active Vonage Verify v2 request. Also supports cancelling an in-progress verification. Requires the **API Key, Secret & Application JWT** auth method.

### Get Account Info

Retrieve Vonage account information including current balance, auto-reload status, and subaccount details. Can also create subaccounts and transfer credit or balance between accounts.

### List Calls

Retrieve voice call records from the Vonage Voice API. Filter by status, date range, or conversation. Use this to monitor call activity, check call statuses, or look up a specific call by UUID. Requires the **API Key, Secret & Application JWT** auth method.

### Make Call

Initiate an outbound voice call using the Vonage Voice API. Control call flow with NCCO (Nexmo Call Control Objects) actions or a remote answer URL. Supports calling phone numbers (PSTN), SIP endpoints, and WebSocket connections. Requires the **API Key, Secret & Application JWT** auth method.

### Manage Applications

Create, list, update, or delete Vonage Applications. Applications are containers for capabilities (Voice, Messages, RTC, VBC) with their own webhook URLs and key pairs. Requires the **API Key, Secret & Application JWT** auth method.

### Manage Call

Control an active voice call: hang up, mute/unmute, earmuff/unearmuff, or transfer to a new NCCO flow. Can also play text-to-speech, stream audio, or send DTMF tones into a call. Requires the **API Key, Secret & Application JWT** auth method.

### Manage Numbers

Search for available virtual phone numbers, list your owned numbers, buy new numbers, cancel (release) numbers, and update number configuration. Combines number search, purchase, and management in one tool.

### Number Insight

Look up intelligence about a phone number using the Vonage Number Insight API. Returns information about number validity, format, carrier, type, reachability, and roaming status. Three tiers are available: - **Basic**: Country, international/national format - **Standard**: Adds carrier name, type (mobile/landline/VoIP), ported status - **Advanced**: Adds reachability, roaming status, SIM swap detection, valid/reachable flags

### Send Message

Send a message across multiple channels including SMS, MMS, WhatsApp, Facebook Messenger, Viber, and RCS using the Vonage Messages API. Supports text, image, audio, video, file, and template message types depending on the channel. Requires the **API Key, Secret & Application JWT** auth method.

### Send SMS

Send an SMS using the Vonage SMS API (legacy). This is a simpler alternative to the Messages API for sending plain text SMS. Uses API Key/Secret authentication and does not require a Vonage Application.

### Verify User

Start a user verification (2FA) request using the Vonage Verify v2 API. Sends a one-time code to the user via one or more channels (SMS, WhatsApp, voice, email, or silent authentication) with automatic failover. Requires the **API Key, Secret & Application JWT** auth method.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
