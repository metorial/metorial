# Salesmate Integration Specification

## Overview

Salesmate is a CRM platform for managing sales pipelines, contacts, deals, activities, and customer support tickets. It provides essential core modules such as contacts, companies, activities, and deals, along with custom modules and a product catalog. It also includes built-in communication tools (calling, texting, email), marketing automation, and ticketing for customer support.

## Authentication

Salesmate uses **API key-based authentication**. To obtain your credentials, sign in to your Salesmate account, click on the User dropdown menu, and navigate to "My Account" > "Access Key". You will need: an **Access Token** (your API key) and an **x-linkname** (the hostname from your Salesmate dashboard URL).

When making API requests, include the following headers:

- `accessToken`: Your API access token/session key
- `x-linkname`: Your Salesmate instance hostname (e.g., if your dashboard URL is `demo.salesmate.io`, the x-linkname is `demo.salesmate.io`)
- `Content-Type`: `application/json`

The API base URL is `https://{domain}.salesmate.io/apis/`, where `{domain}` is the subdomain from the API key connection. Contacts, companies, deals, and activities use their singular resource names followed by `/v4`. Active users use `/core/v4/users?status=active`. The published product endpoints use `/v1/products` and `/v3/products/search`, with a `sessionToken` header and bare subdomain in `x-linkname`. Product sorting is sent as `sortBy` and `sortOrder` query parameters.

The hostname is configured once in the API key connection. An existing stored domain is used only as a fallback when the connection has no hostname.

API keys allow other apps to access your account without giving out your password. Each user in Salesmate has a different set of API keys.

## Features

### Contact Management

Create, read, update, and delete contacts in the CRM. Manage contact relationships with a 360° view, import or capture contacts/leads, enrich them, and track all conversations and activities. Contacts can be segmented using filters and smart views.

### Company Management

Manage company records that serve as parent entities for contacts. Companies hold long-term information such as contact numbers, phone, office numbers, and email addresses. Companies can be associated with contacts and deals.

### Deal Management

Manage deals across customizable sales pipelines. The visual sales pipeline builder lets you create multiple pipelines with customized stages to match your sales process. As deals progress through stages, you gain visibility into pipeline health. Deals can be linked to contacts, companies, and activities.

### Activity Management

Activities can be scheduled tasks, appointments, to-do's, or meetings needed to close a sale and can be associated with contacts, companies, or deals. Create, update, delete, and query activities.

### Products

Create a product catalog with detailed information about each product, including quantities, discounts, and pricing. Products can be associated with deals.

### Tickets

A ticketing module allows customer support teams to create, update, and monitor tickets, which represent individual cases or incidents.

### Custom Modules

Salesmate offers custom modules to meet specific business needs. These custom modules allow you to define and configure the fields you want using built-in custom fields functionality. CRUD operations are available on custom module records.

### Notes

Create, list, retrieve, update, and delete notes linked to CRM records. Notes require a module and record ID. Existing note tools accept optional `linkedModule`, `moduleId`, and `linkedRecordId` fields; provide the record scope when addressing a note. Use `get_module_id` to resolve a custom module API name. Note content is sent as `note`; creation returns `Data.noteId`. Note authorship comes from the API token: create_note validates owner against the current user, and update_note rejects owner reassignment.

### Users

List active users, retrieve an active user by ID, and identify the authenticated user from the `isCurrentUser` flag.

### Email & Communication

Track email conversations with contacts. Salesmate supports two-way email sync and email tracking. Call logging and text messaging are also available through the platform.

## Events

Salesmate supports webhooks through its workflow/automation features. Webhooks are set up as part of Salesmate's automation features (not a standalone API offering). The events you can subscribe to are limited to create/update actions on main entities (Company, Contact, Activity, Deal).

Webhooks are configured by creating automation rules (workflows/smart flows) that trigger a "Call Webhook" action, posting data to a specified URL when conditions are met.

### Contact Events

- **Contact Created**: Triggered when a new contact is added.
- **Contact Updated**: Triggered when an existing contact is modified.
- **Contact Note Created**: Triggered when a note is added to a contact.

### Company Events

- **Company Created**: Triggered when a new company is added.
- **Company Updated**: Triggered when an existing company is modified.
- **Company Note Created**: Triggered when a note is added to a company.

### Deal Events

- **Deal Created**: Triggered when a new deal is created.
- **Deal Updated**: Triggered when a deal is modified (e.g., stage change, status change).
- **Deal Note Created**: Triggered when a note is added to a deal.

### Activity Events

- **Activity Created**: Triggered when a new activity is created.
- **Activity Updated**: Triggered when an existing activity is modified.
- **Activity Note Created**: Triggered when a note is added to an activity.

### User Events

- **User Created**: Triggered when a new user is added.
- **User Deactivated**: Triggered when a user is deactivated.

### Custom Module Events

- **Record Created**: Triggered when a new record is created in a custom module.
- **Record Updated**: Triggered when a record is updated in a custom module.

## API Reference and Verification Limits

Verified against the [official Salesmate API reference](https://apidocs.salesmate.io/) and its published request/response examples. Search tools translate page numbers to `from` offsets, use `displayingFields`, `filterQuery`, and `sort`, and return the provider `totalRows` value as `totalCount`. Deal follower IDs are sent as `userId` objects. Provider failure envelopes are surfaced as errors even when HTTP status is 200.

The current reference does not document standalone ticket CRUD routes; existing ticket tools remain unverified. Product retrieval is also not separately documented. The reference warns that v1/v3 were deprecated in 2023 while continuing to publish only those product routes, so current product API availability remains uncertain. The reference includes no module-ID response example, so discovery accepts a numeric ID or an `id`/`moduleId` field and reports unexpected responses. No authenticated provider calls or live tests were run during this refresh.
