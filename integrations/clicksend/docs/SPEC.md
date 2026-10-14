# ClickSend Integration

## Authentication

Use your ClickSend API username and API key with HTTP Basic authentication. API requests use `https://rest.clicksend.com/v3`. No global configuration is required. `get_account` identifies the authenticated account and reports its balance.

## Supported tools

- Messaging: `send_sms`, `send_mms`, `send_voice`, `send_email`, and `send_letter`.
- SMS tracking: `get_sms_history`, `get_sms_receipts`, `list_inbound_sms`, and `cancel_scheduled_sms`.
- Contact lists: `list_contact_lists`, `create_contact_list`, and `delete_contact_list`.
- Contacts: `list_contacts`, `create_contact`, `update_contact`, and `delete_contact`.
- Discovery: `get_account`, `list_dedicated_numbers`, and `list_email_addresses`.

SMS, MMS, and voice send outputs report the provider's queued count; a queued message is not proof of delivery. `get_sms_receipts` accepts a message ID to retrieve a specific receipt, including read receipts. Receipt listing and inbound-message listing require dashboard rules with their action set to POLL.

All recipients in one MMS request must use the same media file URL. Send different media files in separate requests. Letter recipients require a saved return address ID. Transactional email sender IDs come from `list_email_addresses` and must be verified.

Transactional email and Post are no longer offered to new customers. New customer SMS messages containing URLs may require account approval.

## Official documentation

- [API introduction and authentication](https://developers.clicksend.com/docs)
- [SMS](https://developers.clicksend.com/docs/messaging/sms)
- [MMS](https://developers.clicksend.com/docs/messaging/mms)
- [Voice](https://developers.clicksend.com/docs/messaging/voice-messaging)
- [Email](https://developers.clicksend.com/docs/messaging/email)
- [Letters](https://developers.clicksend.com/docs/post/letters)
- [Contact lists](https://developers.clicksend.com/docs/contacts/lists)
