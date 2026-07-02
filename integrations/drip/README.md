# <img src="https://provider-logos.metorial-cdn.com/getdrip.svg" height="20"> Drip

Manage ecommerce-focused email marketing and CRM. Create, update, list, and delete subscribers with custom fields, tags, and lead scores. Run email series campaigns (drip sequences) and one-time broadcasts. Build and manage automation workflows, including starting or removing subscribers. Track shopper activity by creating and updating orders, carts, and products. Record custom events and conversions for subscribers. Manage tags for segmentation and automation triggers. Configure webhooks to receive real-time notifications on subscriber lifecycle changes, email engagement, lead scoring, and behavioral events. List forms, custom fields, and account information.

## Tools

### Delete Subscriber

Permanently delete a subscriber from Drip by their ID or email address. This action cannot be undone.

### Get Subscriber

Fetch a single subscriber's details by their ID, email address, or visitor UUID. Returns full profile data including tags, custom fields, lead score, and lifetime value.

### List Accounts

List all Drip accounts accessible to the authenticated user. Use this to find account IDs for configuring the integration.

### List Broadcasts

List single-email campaigns (broadcasts) in Drip. Filter by status: draft, scheduled, or sent. Use this to review one-time email sends.

### List Conversions

List conversion goals configured in the Drip account. Conversions track specific subscriber actions like URL visits with configurable default values.

### List Custom Fields

List all custom field identifiers used across subscribers in the Drip account. Use this to discover available custom fields for segmentation and personalization.

### List Event Actions

List all custom event action names used in the Drip account. Use this to see what events have been tracked and what action names are available for automations.

### List Forms

List all lead capture forms configured in the Drip account. Optionally fetch a specific form by its ID for detailed configuration info.

### List Subscribers

List subscribers in your Drip account with optional filters for status, tags, and subscription date range. Supports pagination.

### Manage Campaign

List, fetch, activate, or pause email series campaigns. Also subscribe a person to a campaign or list a campaign's subscribers. Use this to manage drip sequences and their enrollment.

### Manage Cart

Create or update a shopping cart for a subscriber via Drip's Shopper Activity API. Used for cart abandonment workflows and dynamic content in emails.

### Manage Order

Create or update an order for a subscriber using Drip's Shopper Activity API. Supports order lifecycle actions: placed, updated, paid, fulfilled, refunded, canceled. Drip automatically updates subscriber lifetime value based on orders and refunds.

### Manage Product

Create or update a product in Drip's catalog via the Shopper Activity API. Product data enables automations like price drop notifications.

### Manage Subscriber

Create, update, or fetch a subscriber (contact) in Drip. Use this to add new subscribers, update their profile information, manage tags, set custom fields, and configure GDPR consent. If the email already exists, the subscriber will be updated.

### Manage Tags

Apply or remove tags on a subscriber. Tags are used for segmentation and triggering automations. You can also list all tags used in the account.

### Manage Workflow

List, fetch, activate, or pause automation workflows. Start a subscriber on a workflow or remove them from one. Use this to control Drip's automation engine.

### Record Event

Record a custom event (action) for a subscriber, such as "Signed up for a trial" or "Logged in." Events can include custom properties and an optional conversion value. Use this to track behavioral data and trigger automations.

### Unsubscribe

Unsubscribe a subscriber from all mailings or remove them from a specific email series campaign. Use this to manage email opt-outs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
