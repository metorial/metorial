# <img src="logo.svg" height="20"> Reply.io

Manage contacts, sequences and enrollment, templates, private contact lists, blacklist rules and manual tasks. Discover the resolved API user, schedules and email account status, and read sequence and team reports.

API v3 uses Bearer authentication. Team and organization keys may need a user selector; organization keys require a user ID or user email plus team ID. Select only the domain scopes needed (`contacts`, `sequences`, `channels`, `tasks`, `reporting`); write and operate permissions each include read but do not include one another. `get_current_user` requires no domain scope.

Sequence creation requires a name and at least one documented step. It does not start the sequence. Enrollment and starting a sequence may immediately process steps and contact recipients; use them only with intended contacts and sending configuration. Paged contact/sequence tools expose `hasMore`. Template/list/mailbox listing traverses all pages, up to 10,000 records.

Legacy V1 campaign actions still work according to Reply.io, but are unsupported and require `legacy:use` for scoped keys. They retain X-API-Key authentication. Marking replied or finished affects **all campaigns** for the email address; passing campaignId to those actions is rejected rather than implying a narrower effect. An accepted response does not prove a message was delivered.

Current task IDs are assigned numeric IDs, passed as strings to task get/update/delete. Client-assigned ULIDs, automatic-email tasks, account/sequence assignment, due-date list filtering and non-pending task status writes have no exact current equivalent and return explicit guidance. Supply taskType, startAt and dueTo (or dueDate) to create a manual task. Current templates use folderId/folderType; legacy categoryId is retained in the schema but unsupported. Folder moves require the Reply.io interface. Contact aliases for LinkedIn URLs and time zones are mapped to current names; custom field updates use current name/value objects.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
