# <img src="logo.png" height="20"> Email Octopus

Manage email marketing lists, contacts, campaigns, and automations. Create, update, and delete contact lists and contacts with custom fields and tags. Bulk update contacts and upsert contacts by email. Retrieve campaign details and access campaign performance reports including opens, clicks, bounces, complaints, and unsubscribes. View contact-level and link-level campaign analytics. Trigger API-based automations for specific contacts.

Use a current API v2 key; keys labelled legacy cannot authenticate these tools. Call `list_lists` to discover list IDs. Campaigns are read-only through this API and cannot be created or sent. Starting a configured automation can send emails or change contact data; acceptance does not confirm completion.

Original uppercase subscription and field-type inputs remain supported. Optional typed field values, tag removal controls and cursor limits extend existing contracts. See [API behavior and compatibility](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
