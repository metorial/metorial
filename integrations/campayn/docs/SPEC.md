# Campayn Integration Specification

## Overview

Campayn is an email marketing platform. This integration manages contacts and subscribers, and retrieves contact lists, email campaign information, reports, and web sign-up forms through its REST API.

## Authentication

Authentication is done using an API key passed in the HTTP Authorization header with the TRUEREST keyword: `Authorization: TRUEREST apikey=YOUR_API_KEY`.

To get your API key, sign in to your Campayn dashboard, then click on Settings in the left menu. The API Key is displayed inside the Account page.

If you think your key has been compromised, you should regenerate your API key in your Campayn Account section. The old key will no longer be valid.

The base URL for all API requests is `https://campayn.com/api/v1/`.

## Features

### List Management

Retrieve contact/subscriber lists with names, tags, and contact counts, and access the contacts belonging to a specific list. Lists also support unsubscribing contacts by email address or contact ID. Use `list_lists` to discover list IDs.

### Contact Management

Retrieve contacts associated with a specific list, with optional keyword filtering that matches against names, emails, or companies. Create new contacts on a list with detailed profile information including name, email, title, company, address, phone numbers, websites, social accounts, and custom fields. A contact can have multiple phones, sites, custom fields, and social accounts. You can optionally fail on duplicate contacts by setting the `failOnDuplicate` flag. Contacts can also be updated and unsubscribed from lists.

### Email/Campaign Management

Retrieve all email messages visible to the authenticated user with `list_emails`, or retrieve one campaign's status and reporting information with `get_email`. The single-email lookup uses the documented `GET /emails.json` collection and matches its ID; it does not use an undocumented single-email endpoint.

### Reports

Retrieve report URLs and metadata for sent and scheduled emails, optionally filtered by a date range using Unix timestamps in UTC. Scheduled emails will have the report URL set to null.

### Web Forms (Sign-up Forms)

Retrieve all webforms for a specific contact list. Retrieve details of a specific webform by ID, including form details like title, type, HTML, and signup count.

## API References

- [Official API documentation and authentication](https://github.com/nebojsac/Campayn-API)
- [Contacts](https://github.com/nebojsac/Campayn-API/blob/master/endpoints/contacts.md)
- [Lists and unsubscribing](https://github.com/nebojsac/Campayn-API/blob/master/endpoints/lists.md)
- [Emails](https://github.com/nebojsac/Campayn-API/blob/master/endpoints/emails.md)
- [Calendar reports](https://github.com/nebojsac/Campayn-API/blob/master/endpoints/reports.md)
- [Web forms](https://github.com/nebojsac/Campayn-API/blob/master/endpoints/forms.md)

The documented API does not include a current-user endpoint or pagination parameters for these collections. The integration does not expose account signup, which requires separate provider authorization.
