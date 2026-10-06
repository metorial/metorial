# Mixmax

Read email activity, messages, sequences and activated recipients, tasks, templates, polls, meeting invitations, and analytics. Create unsent drafts, manage meeting types, teams, unsubscribe lists and paused rules, and use the connected Salesforce account where its permissions allow it.

Connect with a personal or managed API token. Managed keys need the relevant permissions; task reads require `tasks:read`. Features can depend on the account plan and connected services.

Sending email and activating sequence recipients have immediate communication effects. Set `scheduledAt: false` to retain newly added sequence recipients as drafts; omitted scheduling activates them immediately. The activated-recipient list does not include drafts. Direct email sending does not support tracking. Template deletion moves a template to retained Trash for 28 days, and the API has no documented draft deletion endpoint.

The Contacts API is deprecated but currently documented as functional. Contact creation can merge an existing email. Inline rule actions, bulk cancellation by sequence IDs, contact-group updates, and team invitations by user ID are unsupported; their legacy fields produce an explanatory error.

See the [API reference](https://developer.mixmax.com/reference/getting-started-with-the-api) for permissions, limits, and provider-specific behavior.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
