# <img src="logo.png" height="20"> Moosend

Create and manage draft campaigns, inspect campaign analytics, discover verified senders, and manage email lists, subscribers, custom fields and segments. Campaign and transactional sending require appropriate account permissions and an authorized audience.

Connect with a Moosend API key from More > Settings > API key. The integration uses the documented `https://api.moosend.com/v3` JSON API. Sender discovery reports campaign sender configuration; it does not identify the current user.

Scheduling assigns a date without queuing delivery. Sending is a separate request. Removing a schedule from an already queued campaign can deliver it immediately. Subscriber upserts may resubscribe addresses and clear omitted custom-field values. Unsubscribe behavior follows account settings; removal archives subscribers, and deletion does not promise erasure of provider history. Bulk receipts distinguish partial acceptance from complete success.

The 12 existing tools remain available, with sender discovery added. Legacy `Subject` A/B input maps to the documented `Subjectline` API value; `Decimal` and `Integer` custom fields map to `Number`. The retained `Forward` statistics option and subscriber `since` filter receive explicit validation because the current API does not document them. Statistics dates accept `YYYY-MM-DD` or the provider's `DD-MM-YYYY` format. Draft edits preserve omitted HTML content through a pre-read.

See the [official API documentation](https://docs.moosend.com/api-documentation/articles/KnowledgeBase/54561-Introduction-to-the-Moosend-API?lang=en_US) for provider permissions and feature availability.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
