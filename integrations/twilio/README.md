# <img src="https://provider-logos.metorial-cdn.com/twilio.svg" height="20"> Twilio

Send and receive SMS, MMS, WhatsApp, and RCS messages. Make, receive, and monitor phone calls with programmable call control. Verify user identities via OTP, TOTP, and silent network authentication. Look up phone number intelligence including carrier, line type, caller name, and SIM swap detection. Manage multi-channel conversations across chat, SMS, and WhatsApp. Search for and purchase phone numbers, configure voice and messaging endpoints, schedule messages for future delivery, and inspect call recording metadata.

## Tools

### Check Verification

Verify a code entered by the user against a pending Twilio Verify verification. Returns whether the code is valid and the verification status. Pair with **Send Verification** to implement full OTP flows.

### Conversation Participants

Add, list, or remove participants from a Twilio Conversation. Participants can be chat users (by identity) or SMS/WhatsApp users (by phone number with a proxy Twilio number).

### List Calls

Retrieve call records from your Twilio account. Filter by caller, recipient, status, or time range. Also supports fetching a single call by SID, and modifying an in-progress call.

### List Messages

Retrieve a list of messages from your Twilio account. Filter by sender, recipient, or date. Also supports fetching a single message by SID.

### List Recordings

Retrieve Twilio Programmable Voice recording metadata. Fetch one recording by SID, list account recordings, or list recordings for a specific call.

### List Verify Services

List Twilio Verify Services so you can discover the Service SID required by Send Verification and Check Verification.

### Lookup Phone Number

Look up intelligence about a phone number using the Twilio Lookup API. Returns validation, formatting, and optionally carrier/line type, caller name, SIM swap status, and more. The basic lookup (validation + formatting) is free; additional data packages are paid.

### Make Call

Initiate an outbound phone call via Twilio. The call flow is controlled by a TwiML URL, inline TwiML, or a TwiML Application SID. Supports call recording, machine detection, and status callbacks.

### Manage Conversation

Create, list, update, or delete Twilio Conversations. Conversations support multi-channel messaging across SMS, WhatsApp, and chat. Use this to manage conversation lifecycle and metadata.

### Manage Messaging Service

Create, list, fetch, update, or delete Twilio Messaging Services. Messaging Services group sender pools and shared messaging behavior, and are required for scheduled messages and link-shortened sends.

### Manage Phone Number

Purchase, list, update, or release phone numbers on your Twilio account. Supports purchasing new numbers, listing owned numbers, updating webhook URLs, and releasing (deleting) numbers.

### Modify Call

Modify an in-progress call. Redirect the call to new TwiML instructions, end the call, or cancel a queued call. Useful for programmatic call control like transferring, hanging up, or changing the call flow mid-call.

### Search Phone Numbers

Search for available phone numbers to purchase on Twilio. Filter by country, number type (local, toll-free, mobile), area code, capabilities, and more. Returns a list of numbers that can be purchased using the **Purchase Phone Number** tool.

### Send Conversation Message

Send a message within a Twilio Conversation. Messages are automatically delivered to all participants across their respective channels (SMS, WhatsApp, chat). Also supports listing messages in a conversation.

### Send Message

Send an SMS, MMS, or WhatsApp message to a phone number. Supports sending text messages, media attachments, and scheduled messages. Use a **From** number or a **Messaging Service SID** to send. Scheduled messages require a Messaging Service SID.

### Send Verification

Send a verification code (OTP) to a user via SMS, WhatsApp, voice call, or email using Twilio Verify. Requires a pre-configured Verify Service. Use the **Check Verification** tool to validate the code entered by the user.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
