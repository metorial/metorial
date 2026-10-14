# Waboxapp API integration

Use an API token and a linked WhatsApp phone number in international format,
with digits only and no plus prefix. Waboxapp also accepts enabled APP tokens.
The linked phone number belongs to authentication; connection configuration is
empty. Existing credentials keep the same fields.

Requests use the documented `https://www.waboxapp.com/api` base, token query
parameter and form encoding. Requests time out after 30 seconds. Provider
HTTP errors, invalid input and responses without confirmed success produce a
user-facing error.

## Tools

- `send_message` submits text, an image, a link or a media file using the
  corresponding `/send/chat`, `/send/image`, `/send/link` or `/send/media`
  endpoint. Text needs `text`; other content needs a publicly accessible
  HTTP or HTTPS `url`. Every message needs a unique `customMessageId`. Image,
  link and media previews accept caption and description; link and media
  previews also accept `thumbnailUrl`. The original message-type enum and
  input fields remain unchanged.
- `get_account_status` reads `/status/{phoneNumber}`. It exposes the account
  phone number and maps documented `alias`, `hook_url`, numeric-string
  `battery` and `plugged` values into the existing account-name, webhook-URL,
  number and boolean outputs. Legacy `name` and `hook` response fields remain
  supported. Raw responses are preserved.

API acceptance does not confirm delivery or reading. Acknowledgements need
separately configured provider webhooks; these tools do not receive them.
Account details alone do not establish a live connection. Keep the linked
phone and Chrome extension online as directed by Waboxapp.

The public reference documents four sending endpoints and the account status
endpoint; all are covered by the existing tools. No additional account-list
or user-profile endpoint is documented, so no speculative tools are added.

## Sources

- [Official API v3 reference](https://www.waboxapp.com/assets/doc/waboxapp-API-v3.pdf)
- [Official REST examples](https://www.waboxapp.com/wapi/rest)
- [Connection setup](https://www.waboxapp.com/)
