# AMcards integration

AMcards prints and mails personalized greeting cards and runs drip campaigns. This integration uses a bearer access token generated at [Generate Access Token](https://amcards.com/user/generate-access-token/). No workspace or account ID is required during setup.

## Workflows

- `get_account_info` identifies the connected account and preserves the complete provider response.
- `list_quicksend_templates` discovers configured templates for `send_card`. Public templates must first be added to Quicksend Templates in AMcards; `list_templates` browses public templates separately.
- `list_campaigns` discovers configured drip campaign IDs for `schedule_drip_campaign`.
- `send_card` submits a card request. `schedule_drip_campaign` submits a campaign request and exposes the returned mailing and card IDs. Both accept optional custom merge fields and return-address overrides. Omitting the send date lets AMcards schedule mailing for the following day.
- `get_card_history` pages through cards and can filter by an external CRM contact ID. `get_card` retrieves the complete record for one card.
- `search_contacts` pages through contacts with name/email filters. `get_contact` retrieves a complete contact; `create_contact` resolves its owner from the connected account; `delete_contact` deletes an internal AMcards contact ID.
- `cancel_cards_by_contact` requests cancellation of editable cards using the external contact ID. Printed or mailed cards cannot be cancelled through this operation.

List tools retain their existing returned-item count and additionally expose the provider’s total count, next offset when available, and unmodified response. Card status is returned as a string to preserve the existing output type; the documented provider values include `0` (editable), `2` (in the mail), `4` (delivered), and `6` (printed).

## API references

The [first-party Python SDK](https://github.com/amcards/python-amcards) and its [API documentation](https://python-amcards.readthedocs.io/en/latest/amcards.html) document bearer authentication, singular resource routes, pagination using `limit`/`offset`, `objects` list envelopes, and card/campaign send requests. The [official Zapier guide](https://help.amcards.com/hc/en-us/articles/7131855100429-How-to-use-AMcards-com-with-Zapier) explains the distinction between public templates and configured Quicksend Templates.

Provider behavior has not been verified with live calls in this refresh. The legacy public-template and contact-cancellation routes were preserved because the accessible first-party SDK does not document them and the main API documentation was unavailable behind a browser challenge.
