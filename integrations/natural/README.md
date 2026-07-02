# <img src="https://natural.co/assets/brand/natural-logo.svg" height="20"> Natural

Manage Natural agentic payments workflows through the REST API. This integration covers agents, customer delegations, wallets, counterparties, payments, transfers, payment requests, approvals, party administration, API keys, agent keys, webhooks, and events.

## Tools

### Agents

List, create, retrieve, update, and delete agents. Manage delegated customer access, invitations, permissions, and limits.

### Customers

List customer records and invitations, create customer invitations, and revoke invitations or customer-agent access.

### Money Movement

List, create, inspect, and cancel payments. List, inspect, deposit, and withdraw transfers. Money movement tools require `confirm: true` and idempotency keys where Natural documents them.

### Payment Requests

List sent and incoming payment requests, create requests, inspect request state, fulfill requests from a wallet or external account, and decline requests.

### Transactions, Wallets, External Accounts, And Counterparties

Review transaction history, wallet balances and deposit instructions, external account metadata, and counterparties.

### Approvals And Party Admin

List and resolve approvals, inspect and update the current party profile, manage party invitations, and remove party members.

### API Keys, Agent Keys, Webhooks, And Events

List, create, inspect, and revoke API keys and agent keys. Configure webhooks, rotate webhook secrets, and inspect event delivery records.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
