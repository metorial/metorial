# CastingWords integration

The [API4 reference](https://castingwords.com/docs/developer/SimpleAPI.html) defines API-key authentication, URL orders, audiofile lookup, transcript downloads, upgrades, refunds, invoices, balance, and account notification settings.

## Connection

Use the secret API key from [account settings](https://castingwords.com/customer/info). The connection has no additional configuration fields. The API does not document a current-user endpoint.

## Tools

| Tool | Purpose |
| --- | --- |
| `order_transcription` | Submit media URLs with service SKUs, notes, and speaker names; expose any billing hold |
| `get_audiofile_status` | Read processing state and audiofile details |
| `retrieve_transcript` | Retain the original text result and prepare the requested downloadable file |
| `download_transcript` | Download TXT, DOC, RTF, HTML, DOCX, timestamped text, SRT, or VTT |
| `upgrade_audiofile` | Add services or upgrade the transcription tier |
| `cancel_audiofile` | Request a refund before transcription work begins |
| `get_invoice` | Read invoice state, amounts, timestamps, and line items |
| `get_prepay_balance` | Read available prepay funds |
| `get_webhook` | Read the account notification destination |

Test orders do not receive transcription. Refund and upgrade test mode supports audiofile IDs 100 and 101. A successful order response can include a billing hold; retain the returned IDs and resolve the account balance before expecting transcription.

Transcript downloads use the authenticated provider GET endpoint. Formats requiring captions or timestamps depend on the purchased service. Existing transcript text remains available for compatibility. Other tools preserve provider data, including unmodeled fields and nulls, with credentials removed. Numeric audiofile IDs retain their public number schema and are validated as positive safe integers at runtime.

## Scope

This integration represents a single transcription API. The reference provides no list/search pagination or account identity endpoint. Account-wide webhook writes and callback reception are outside this tool set.
