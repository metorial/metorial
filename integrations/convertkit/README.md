# <img src="https://provider-logos.metorial-cdn.com/convertkit.png" height="20"> ConvertKit

Manage Kit email marketing data for creator-focused newsletters, forms, sequences, broadcasts, purchases, posts, and reusable snippets. The integration uses Kit API V4 and supports OAuth 2.0 plus V4 API key authentication where the upstream API allows it. Purchase creation is OAuth-only in Kit API V4.

## Tools

### Create Purchase

Import a purchase or transaction record into Kit and associate it with a subscriber by email. Includes product details, pricing, transaction metadata, and the created purchase id.

### Get Account

Retrieve Kit account information including account name, plan type, primary email address, timezone, and sending addresses returned by the API.

### Get Account Insights

Retrieve account-level insight data from Kit API V4, including creator profile details, email stats, or growth stats.

### List Email Templates

List available email templates that can be used when creating broadcasts.

### List Segments

List saved subscriber segments configured in the Kit dashboard.

### List Subscribers

List and search subscribers in your Kit account. Filter by status, email, date ranges, or list subscribers for a specific tag, form, or sequence.

### Manage Broadcasts

Create, update, get, list, delete, or inspect analytics for one-time email broadcasts. Supports scheduled sends, broadcast stats, and broadcast click analytics.

### Manage Custom Fields

List, create, update, or delete custom fields used to store additional subscriber data.

### Manage Forms

List forms and landing pages, or add subscribers to a form. Adding a subscriber may trigger opt-in confirmation depending on form settings.

### Manage Posts

List or retrieve public Kit posts by id.

### Manage Purchases

List or retrieve existing purchase records, including subscriber, product, status, and transaction metadata returned by Kit.

### Manage Sequence Emails

List, create, get, update, or delete emails within a sequence.

### Manage Sequences

Create, update, get, delete, list email sequences, or enroll subscribers in a sequence. Sequences are automated drip campaigns that send a series of emails over time.

### Manage Snippets

List, create, get, update, archive, or restore reusable Kit snippets. Supports both inline snippet content and block snippets with HTML document attributes.

### Manage Subscriber

Create, update, get, unsubscribe, list tags for, or retrieve engagement stats for a subscriber.

### Manage Tags

Create, update, list tags, or manage tag-subscriber associations.

## Events

Supports webhooks for subscriber activation, unsubscribe, bounce, complaint, form subscription, tag changes, sequence subscription/completion, purchase creation, link click, and product purchase events.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
