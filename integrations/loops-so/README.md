# Loops.so

Manage contacts and their mailing-list subscriptions, discover contact properties and published transactional templates, verify the connected team and check contact suppression. Send explicitly requested transactional emails or workflow events with optional idempotency keys.

The API key belongs to one team and is sent as a Bearer token. No setup identifiers or OAuth scopes are required. Contact creation/update and event submission can trigger workflows or change subscriptions. Unsubscribed contacts can still receive transactional emails and critical-notice campaigns. A successful send response confirms provider acceptance, not delivery; uncertain sends are not retried automatically.

Published-template discovery preserves the provider's supported deprecated `/transactional` listing and returns its continuation cursor. Draft content-authoring APIs are outside this integration. Custom property definitions must already exist; their values can be reset with null. Reserved fields and explicit inputs cannot be overwritten through property dictionaries.

Email attachments use the original base64 input fields and require provider enablement. The complete JSON send request must be smaller than 4 MB. This integration does not download or export files.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
