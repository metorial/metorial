# <img src="https://provider-logos.metorial-cdn.com/mailchimp.svg" height="20"> Mailchimp

Manage email marketing audiences, campaigns, and automations. Create, send, schedule, and track email campaigns with detailed reporting on opens, clicks, and bounces. Add, update, and organize audience contacts with tags, segments, and interest groups. Set up and manage automation workflows triggered by subscriber activity or events. Connect e-commerce stores to manage customers, products, orders, and carts. Create and manage reusable email templates and landing pages. Upload and organize files for use in campaigns. Send transactional emails via the Mandrill API. Post custom events to trigger targeted automations. Configure webhooks to track subscribe, unsubscribe, profile updates, and email delivery events.

## Tools

### Add Member Event

Post a custom event for a list member. Custom events can trigger automations and Customer Journeys. Provide the event name and optional key-value properties.

### Get Audience Activity

Retrieve recent activity and growth history for an audience. Shows daily stats including subscribes, unsubscribes, email activity, and audience growth over time.

### Get Campaign Report

Retrieve performance reports for a specific campaign or list all campaign reports. Returns open rates, click rates, bounce stats, unsubscribes, and e-commerce data. Provide a campaignId for a specific report, or omit to list all reports.

### List Audiences

Retrieve all audiences (lists) in the Mailchimp account. Returns audience names, IDs, member counts, and configuration details. Use this to discover available audiences before managing members or campaigns.

### List Automations

Retrieve classic automation workflows from the Mailchimp account. Returns workflow IDs, names, statuses, trigger settings, and email counts.

### List Campaigns

Retrieve campaigns from the Mailchimp account. Filter by status or type. Returns campaign IDs, titles, subjects, status, send time, and recipient list info.

### List Members

Retrieve members (contacts) from an audience. Supports filtering by status and pagination. Returns email, status, merge fields, tags count, and activity stats.

### List Templates

Retrieve email templates from the Mailchimp account. Filter by type (user-created or Mailchimp gallery). Returns template IDs, names, types, and creation dates.

### Manage File Manager

List, get, upload, update, or delete File Manager files and folders. Use uploaded file URLs in campaigns, templates, signup forms, and landing pages.

### Manage Interest Groups

List, get, create, update, or delete audience interest categories and interests. Interest categories are group titles; interests are group names that contacts can be assigned to.

### Manage Merge Fields

List, get, create, update, or delete audience merge fields. Merge fields store custom contact data used for personalization, segmentation, and signup forms.

### Manage Audience

Create, update, or delete an audience (list). To create, provide name, contact info, permission reminder, and campaign defaults. To update, provide the listId and the fields to change. To delete, provide the listId and set "delete" to true.

### Manage Automation

Control a classic automation workflow: start, pause, or archive it. Can also add or remove subscribers from the automation queue.

### Manage Campaign Content

Get or set the HTML/plain-text content of a campaign. Use to read the current content or update it with custom HTML, plain text, or a template-based approach.

### Manage Campaign

Create, update, or delete an email campaign. Supports setting recipients, subject line, content, tracking options, and more. To create, omit campaignId. To update, provide campaignId with fields to change. To delete, provide campaignId and set delete to true.

### Manage Member

Add, update, or remove a member (contact) in an audience. Supports subscribe, unsubscribe, update profile/merge fields, archive, and permanent delete. Uses email address to identify members (MD5 hash is computed automatically).

### Manage Segments

List, create, update, or delete segments within an audience. Segments are used to target specific groups of contacts in campaigns. Supports both static and saved segments.

### Manage Member Tags

Add or remove tags from a member in an audience, or list a member's current tags. Tags are used to organize and segment contacts. Provide tags with "active" to add or "inactive" to remove.

### Manage Template

Create, update, or delete an email template. To create, provide a name and HTML content. To update, provide templateId and the fields to change. To delete, provide templateId and set delete to true.

### Search Members

Search for members (contacts) across all audiences or within a specific audience. Searches by email address, name, and other profile data. Returns matching members with their audience and subscription info.

### Send Campaign

Send, schedule, unschedule, or cancel a campaign. Can also send a test email or replicate a campaign. Use the send checklist to verify readiness before sending.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
