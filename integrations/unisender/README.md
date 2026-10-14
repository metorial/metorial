# Unisender

Manage contact lists, subscriptions, bulk imports, custom fields, and tags in the Unisender marketing platform. Create and update email messages and reusable templates, send test emails, schedule or cancel campaigns, and review campaign statistics. Send individual email and SMS messages and check their delivery statuses. Inspect account information and request sender email verification.

## Common workflows

- Discover contact list IDs with `get_lists`, then subscribe contacts or import up to 500 rows per call. Use the `email_list_ids` import column for comma-separated list IDs.
- Create an email message, preview it with `send_test_email`, and send it with `launch_campaign`. `update_email_message` returns the current message version ID for subsequent launches.
- Pass `email_id` values from `send_email` to `check_email_delivery`. Delivery statuses are retained by the provider for one month.
- Keep the `sms_id` returned by `send_sms` as text and pass it to `check_sms_delivery`; some SMS IDs contain a dot and a phone number.

## Authentication

Connect with an API key from your Unisender account settings. The optional locale setting controls the API language (`en` or `ru`). This integration uses the marketing API, which is separate from Unisender Go.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
