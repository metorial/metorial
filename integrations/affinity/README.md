# <img src="logo.jpeg" height="20"> Affinity

Manage people, organizations, opportunities, notes, reminders, list entries and field values in Affinity. Read lists, field definitions, interaction metadata and relationship strengths, inspect the current API user, and download existing entity files.

The integration uses Affinity's supported V1 API with a Bearer API key from Settings > Manage Apps. Access follows the key owner's product permissions and account API entitlement. Global organizations cannot be renamed or deleted. Opportunity list-entry deletion also deletes its opportunity. Record and list changes can activate account automations; reminders can notify their owners.

Search and list tools return one provider page at a time. Keep filters unchanged when following `nextPageToken`. Interaction queries require one external entity, one interaction type and a date range of at most one year. See the [API scope and constraints](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
