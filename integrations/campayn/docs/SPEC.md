Note: The webhook search results are for Campaign Monitor and ActiveCampaign, not Campayn. There's no evidence that Campayn itself supports webhooks.

# Slates Specification for Campayn

## Overview

Campayn is an email marketing platform based in Toronto, Canada, that enables users to create, send, and track email newsletters and marketing campaigns. It provides programmatic access to manage contacts, lists, and email campaigns through its REST API.

## Authentication

Authentication is done using an API key passed in the HTTP Authorization header with the TRUEREST keyword: `Authorization: TRUEREST apikey=YOUR_API_KEY`.

To get your API key, sign in to your Campayn dashboard, then click on Settings in the left menu. The API Key is displayed inside the Account page.

If you think your key has been compromised, you should regenerate your API key in your Campayn Account section. The old key will no longer be valid.

The base URL for all API requests is `https://campayn.com/api/v1/`.

## Features

### List Management

Manage contact/subscriber lists. You can retrieve all lists, view list details, and access the contacts belonging to a specific list. Lists also support unsubscribing contacts by email address.

### Contact Management

Retrieve contacts associated with a specific list, with optional keyword filtering that matches against names, emails, or companies. Create new contacts on a list with detailed profile information including name, email, title, company, address, phone numbers, websites, social accounts, and custom fields. A contact can have multiple phones, sites, custom fields, and social accounts. You can optionally fail on duplicate contacts by setting the `failOnDuplicate` flag. Contacts can also be updated and unsubscribed from lists.

### Email/Campaign Management

Retrieve all email messages visible to the authenticated user, and retrieve details of a specific message by its ID.

### Reports

Retrieve report URLs and metadata for sent and scheduled emails, optionally filtered by a date range using Unix timestamps in UTC. Scheduled emails will have the report URL set to null.

### Web Forms (Sign-up Forms)

Retrieve all webforms for a specific contact list. Retrieve details of a specific webform by ID, including form details like title, type, HTML, and signup count.

## Events

The provider does not support events. Campayn's API does not offer webhooks or any built-in event subscription mechanism. Third-party platforms like Pipedream implement polling-based triggers (e.g., checking for new contacts or new emails) but these are not native to the Campayn API.
