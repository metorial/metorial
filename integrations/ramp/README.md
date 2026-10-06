# <img src="logo.svg" height="20"> Ramp

Read transactions, reimbursements, vendors, entities, business information and balances. Manage users, departments, spend programs, approved bills, physical cards and funds. Use exact resource readbacks and deferred user-task status to confirm provider state.

Authenticate with OAuth or an internal application's client credentials, selecting separate production or sandbox credentials. Current cards and funds use explicit selectors; the default legacy card and limit routes remain available for compatibility, with account availability unverified by the current public reference. Legacy limit IDs are never assumed to be fund IDs.

New connections request current Funds permissions and do not request legacy Limits scopes. Use `resource=fund` for a new connection; legacy limit operations require an existing suitable grant and separately confirmed account support.

Bill creation automatically approves the bill and can initiate payment. Archiving can cancel payments or terminate an attached one-time card. Fund and card termination is permanent. User invitations require accepted onboarding after the deferred task completes. Confirm the intended business, resource ownership and financial or notification effects before making changes.

See the [implemented tool surface](docs/SPEC.md) and [Ramp API documentation](https://docs.ramp.com/developer-api/v1/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
