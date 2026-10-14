# GetProspect

Find and verify B2B email addresses, identify the connected user and workspace, and check credit balances before paid lookups. Email tools use the current GetProspect API v2 and return mailbox and domain health separately. Legacy lead, company, outreach sequence, tag, note, and domain tools retain their existing API routes.

Connect with an API key from your [GetProspect account settings](https://app.getprospect.com/settings/api). Call `get_current_user` to check the connection and `get_credit_balances` to inspect available credits. Live email lookups can take more than a minute; newly revealed valid emails and definitive verification results may spend credits.

See the [API contract notes](./docs/SPEC.md) for endpoint coverage and compatibility limits.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
