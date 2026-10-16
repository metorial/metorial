# ActiveTrail

Create and manage email and SMS campaigns, send WhatsApp and transactional messages,
organize contacts in groups and mailing lists, inspect campaign reports, activate
existing automations, maintain reusable email templates, configure webhooks, and
discover sending profiles and account balances.

Authenticate with an ActiveTrail API token from **Settings → API Apps**. Tokens can
have an expiry date or IP restrictions. Replace an expired or revoked token in the
connection settings.

Use `get_account_info` to discover email and SMS sending profile IDs,
`list_groups` and `list_mailing_lists` for recipient targeting, and
`list_template_categories` for template categories. WhatsApp sending profiles and
approved message templates have dedicated discovery tools.

See the [ActiveTrail API reference](https://webapi.mymarketing.co.il/api/docs) and
[available capabilities](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
