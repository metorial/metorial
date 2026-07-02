Let me get more details on the API endpoints and OAuth scopes, and check if Apollo.io has native webhook support.Now let me check for native webhook support in Apollo.io's API:Now I have enough information to write the specification.

# Slates Specification for Apollo.io

## Overview

Apollo.io is a B2B sales intelligence and engagement platform that provides access to a database of over 275 million contacts and 70 million companies. It offers data enrichment, prospecting, contact/account management, deal tracking, email sequencing, and task management capabilities through a REST API.

## Authentication

Apollo.io supports two authentication methods:

### 1. API Key

You need to create an API key to access the Apollo API. The API key should be included in the header of your API request.

- Navigate to Settings > Integrations in Apollo, click Connect beside Apollo API, then click API Keys > Create new key. Enter a name and description, then select each API endpoint that you want the key to have access to.
- You can toggle "Set as master key" to select all endpoints. Some endpoints, like Get a List of Users, are only accessible with a master key.
- The API key is passed via the `x-api-key` header or as a `api_key` query parameter.
- You must be an admin for your Apollo account or be assigned the necessary permission profile to create API keys.

### 2. OAuth 2.0 (for Partners/Integrations)

Apollo supports the OAuth 2.0 authorization code grant type. This method is intended for building integrations that act on behalf of Apollo users.

**Setup:**

1. Navigate to Settings > Integrations in Apollo, find the API option and click Connect, then click OAuth registration.
2. Provide: App Name, App Logo (optional), OAuth Redirect URL(s) (must use HTTPS, up to 4 URLs), and Scopes.
3. Copy the client ID and secret. The client ID is a public identifier for your app. The client secret is a confidential key used to authenticate your app.

**Flow:**

1. Direct users to the authorization URL:
   `https://app.apollo.io/#/oauth/authorize?client_id=<your_client_id>&redirect_uri=<redirect_uri>&response_type=code&scope=<scopes>&state=<state>`
2. After the user authorizes, you receive an authorization code. You can then exchange it for an access token and refresh token.
3. Token exchange endpoint: `POST https://app.apollo.io/api/v1/oauth/token` with parameters: `grant_type`, `client_id`, `client_secret`, `redirect_uri`, `code`.

**Scopes:**

- Set the scopes (permissions) for your app. Each scope provides access to specific Apollo API endpoints. Only add scopes necessary for your app's functionality. By default, Apollo adds `read_user_profile` and `app_scopes` for all selected scopes.
- Scopes are endpoint-specific (e.g., `contacts_search`, `person_read`).
- If you edit scopes later, you need to repeat the entire authorization flow.

## Features

### People Search

Search Apollo's database to find prospects based on demographic filters, including job titles, locations, and seniority.

- This endpoint is primarily designed for prospecting net new people. It does not return email addresses or phone numbers. Use enrichment endpoints for that.
- Filters include industry, company size, location, job title, seniority, and more.

### Organization Search

Search for companies in the Apollo database. Several filters are available to help narrow your search.

- Can also retrieve active job postings for organizations.

### Data Enrichment

Perform data enrichment for both people and organizations. Enrich the data of an individual person or organization, or enrich data in bulk.

- People enrichment accepts identifiers like email, name, or domain to return detailed profile data.
- By default, this endpoint does not return personal emails or phone numbers. Use the `reveal_personal_emails` and `reveal_phone_number` parameters to retrieve them.
- Waterfall enrichment can be enabled to check connected third-party data sources for broader contact email and phone number coverage.
- Bulk enrichment supports up to 10 records per request.
- Enrichment consumes credits based on your pricing plan.

### Contact Management

Create new contacts in Apollo from other systems, update contact details, search for contacts, and manage contact ownership and stages.

- Supports bulk creation of contacts.
- Does not handle deduplication.
- Converting enriched people into contacts makes their data permanently accessible to your organization, avoiding repeated credit consumption.

### Account Management

Create and update companies in your database, search for accounts, and manage account stages and ownership.

- Supports bulk account creation.

### Deal Management

Create, view, and update deals associated with companies and people.

- List all deals or view individual deal details.
- Update and search existing deals.

### Sequence Management

Modify existing sequences with API calls instead of manually clicking through the UI.

- Search for sequences, add contacts to sequences, and update contact status within sequences.
- Useful for automating outbound email cadences programmatically.

### Task Management

Create and manage tasks associated with your sales workflow.

- Make updates to things like task priority, due date, custom fields, and more.
- Supports bulk task creation and searching for tasks.

### Call Records

Create, search, and update call activity records within Apollo.

- Log call outcomes and associate calls with contacts and accounts.

### User and Email Account Management

Retrieve a list of users in your Apollo organization and view connected email accounts.

- Some endpoints (like listing users) require a master API key.

## Events

Apollo.io does not offer a general-purpose webhook or event subscription system for listening to changes in contacts, accounts, deals, or other objects.

The only webhook mechanism available is for waterfall enrichment: when you call an enrichment endpoint with waterfall parameters, Apollo returns an immediate synchronous response with demographic and firmographic data, and then delivers enriched emails and/or phone numbers asynchronously to a configured webhook. This is a callback-style webhook tied to specific enrichment requests, not a general event subscription system.
