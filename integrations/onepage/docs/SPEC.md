# OnePageCRM Integration Specification

## Overview

OnePageCRM is a cloud-based, action-focused CRM designed for small businesses. The REST APIs allow for CRUD operations on various CRM entities, including contacts, companies, deals, and activities. Contacts represent the people you are actively trying to sell to, and related sub-resources like Actions, Deals, Notes, Calls and Meetings.

## Authentication

The OnePageCRM API uses HTTP Basic Authentication. To authenticate, you need the `user_id` and `api_key` associated with your OnePageCRM account. Your username is your `user_id` and your password is your `api_key`.

This information can be found by logging into your OnePageCRM account and navigating to `https://app.onepagecrm.com/app/api` and selecting the configuration tab.

The API base URL is `https://app.onepagecrm.com/api/v3/`.

Requests are authenticated by including the `user_id` and `api_key` as HTTP Basic Auth credentials with each request. For example:

```
Authorization: Basic base64(user_id:api_key)
```

A legacy login endpoint exists that uses login and password, but the recommended method is HTTP Basic Authentication using `user_id` and `api_key`.

## Features

### Contact Management

Manage contacts — the people you are actively trying to sell to — along with related sub-resources like Actions, Deals, Notes, Calls, and Meetings. Contacts include fields such as name, emails, phones, URLs, addresses, tags, status, lead source, company association, and custom fields.

### Company Management

Companies (referred to as "organizations" in the web application) are logical collections of Contacts and related sub-resources like Deals and Actions, along with basic info such as postal address and website. A Company may not be created directly or exist without a Contact.

### Action Stream

Actions are completable tasks related to Contacts. They are ordered as: ASAP first, then dated actions ordered by due date (overdue first), followed by waiting-for (blocked) and finally queued actions (without any date). The Action Stream is a listing of contacts prioritized by when their next action is due, and is the default view in the OnePageCRM web application.

### Deal Management

Manage sales pipelines including deal stages. Each product, service, or group may have a different pipeline. Deals have properties such as name, amount, status (pending/won/lost), stage, expected close date, and can be associated with contacts.

### Notes, Calls, and Meetings

Log notes, calls, and meetings against contacts to track all interactions. Meetings support file attachments. Attachments can be associated with Deals, Notes, Calls, or Meetings and can be uploaded to S3 or stored in external providers like Google Drive, Dropbox, or Evernote.

### Predefined Items and Groups

A user-configured list of items representing products or services, which can be used to standardize deal creation. Predefined Item Groups allow grouping of items, useful if items can be sold as part of a package or complement one another.

### Custom Fields

Extra user-configurable data fields are available for Contacts, Companies, and Deals. Custom field definitions are only editable by admins.

### Contact Statuses and Lead Sources

Statuses help qualify where contacts are in the sales pipeline. The list of Statuses comes pre-populated but can be updated to fit your organization. Lead Sources classify the source of any contact added to OnePageCRM.

### Relationship Types

Manage relationship types used to identify the relationships between contacts.

### Notifications

Fetch notifications for the logged-in user, except email and link notifications.

### Reference Data

Access a list of all compatible countries and their ISO-3166 codes.

## Events

OnePageCRM supports webhooks to receive real-time notifications when data changes in the CRM.

Webhooks are configured by an account administrator from the Apps page in OnePageCRM. You provide a URL to receive POST requests, and optionally a secret key for validation. Each webhook POST includes a `timestamp`, `secretkey`, `type`, `reason`, and the `data` payload.

### Contact Events

Triggered when a contact is created, updated, deleted, or undeleted (restored after deletion).

### Action Events

Triggered when an action is created, updated, deleted, completed, or uncompleted (reopened).

### Deal Events

Triggered when a deal is created, updated, or deleted. Additional deal-specific reasons include: expected close time updated, changed to pending (with deal stage info), changed to won, and changed to lost.

### Note Events

Triggered when a note is created, updated, or deleted.


## Registered API additions

- `get_current_user`: reads `GET /users/{user_id}` using the authenticated API user ID. Returns the user's identity and account rights.
- `get_deal`: reads `GET /deals/{deal_id}` so a discovered deal can be inspected independently.
- `delete_note`: calls `DELETE /notes/{note_id}`. The API permanently removes the note and its associated files; it does not support undo.

## Compatibility details

Contact addresses use the provider's `address_list`; the existing single `address` input replaces that list with one address. Contact starring uses the additive boolean `starred` input. The existing numeric `starValue` input is retained but rejected with guidance because the provider has no numeric star rating. Company and deal `customFields` retain their public shape and use `company_fields` and `deal_fields` upstream. Action completion and reopening use the documented `mark_as_done` and `undo_completion` endpoints; completion state and field edits must be submitted separately.

Official API reference: https://developer.onepagecrm.com/api/reference/
