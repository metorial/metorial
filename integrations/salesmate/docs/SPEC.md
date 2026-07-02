# Slates Specification for Salesmate

## Overview

Salesmate is a CRM platform for managing sales pipelines, contacts, deals, activities, and customer support tickets. It provides essential core modules such as contacts, companies, activities, and deals, along with custom modules and a product catalog. It also includes built-in communication tools (calling, texting, email), marketing automation, and ticketing for customer support.

## Authentication

Salesmate uses **API key-based authentication**. To obtain your credentials, sign in to your Salesmate account, click on the User dropdown menu, and navigate to "My Account" > "Access Key". You will need: an **Access Token** (your API key) and an **x-linkname** (the hostname from your Salesmate dashboard URL).

When making API requests, include the following headers:

- `accessToken`: Your API access token/session key
- `x-linkname`: Your Salesmate instance hostname (e.g., if your dashboard URL is `demo.salesmate.io`, the x-linkname is `demo`)
- `Content-Type`: `application/json`

The API base URL follows the pattern: `https://{domain}.salesmate.io/apis/core/v4/`, where `{domain}` is your Salesmate subdomain.

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

Add notes to contacts, companies, deals, and activities to track additional context and information.

### Users

Manage users within the Salesmate account, including creating users and retrieving user information.

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
