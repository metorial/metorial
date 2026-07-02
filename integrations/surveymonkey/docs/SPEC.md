Now let me get the full list of scopes and the contact/contact list features:# Slates Specification for SurveyMonkey

## Overview

SurveyMonkey is an online survey platform that allows users to create, distribute, and analyze surveys. The SurveyMonkey API is REST-based, employs OAuth 2.0, and returns responses in JSON. The API provides access to survey creation, retrieval, and distribution functionality, along with deep insights into responses.

## Authentication

SurveyMonkey uses **OAuth 2.0** with the **authorization code grant type** for authentication.

### OAuth 2.0 Flow

If you have a Private app and will only access your own SurveyMonkey account, you can use the access token generated when you registered your app, found in the Settings of your app in the MY APPS tab. If your app will access many SurveyMonkey accounts, implement the OAuth 2.0 three-step flow, which generates a long-lived access token your app can use with every API call to the associated SurveyMonkey account.

**Endpoints:**

- Authorization URL: `https://api.surveymonkey.com/oauth/authorize`
- Token URL: `https://api.surveymonkey.com/oauth/token`

Depending on the originating datacenter of the SurveyMonkey account, the API access URL may differ. The API for the EU datacenter is `https://api.eu.surveymonkey.com` and the API for the Canadian datacenter is `https://api.surveymonkey.ca`. The correct API access URL for each account is returned in the response body of the code-for-token exchange under the `access_url` key.

**Required Credentials:**

- Client ID and Client Secret, both generated once you create an app.
- Redirect URI (configured in your app settings)

**Token Exchange:**

Create a form-encoded HTTP POST request to `https://api.surveymonkey.com/oauth/token` with the following fields: `client_id`, `client_secret`, `code`, `redirect_uri`, and `grant_type` (set to `authorization_code`).

The access token is passed as an HTTP header in the format `Authorization: bearer YOUR_ACCESS_TOKEN`.

**Scopes:**

Scopes allow apps to access particular resources on behalf of a user. Available scopes (based on the API response for user info) include:

- `users_read` – View user account details
- `surveys_read` / `surveys_write` – View / Create & modify surveys
- `collectors_read` / `collectors_write` – View / Create & modify collectors
- `contacts_read` / `contacts_write` – View / Create & modify contacts
- `responses_read` / `responses_read_detail` / `responses_write` – View responses (summary or detail) / Create & modify responses
- `groups_read` / `groups_write` – View / Manage team groups
- `webhooks_read` / `webhooks_write` – View / Create & modify webhooks
- `library_read` – View survey template library
- `workgroups_read` / `workgroups_write` / `workgroups_shares_read` / `workgroups_shares_write` – Manage workgroups and shared resources

Two scopes, Create/Modify Responses and Create/Modify Surveys, require SurveyMonkey's approval to use in a Public app. You can set scopes to be required, optional, or not required in your app's settings. All required scopes must be approved by and available to the user for the OAuth process to succeed.

**App Types:**

- Public apps are available to anyone with a SurveyMonkey account and published in the App Directory. Private apps are for yourself or your organization.
- All users of a Private app must belong to the same SurveyMonkey team and have a paid SurveyMonkey plan that offers direct API access.

## Features

### Survey Management

Create, read, update, and delete surveys. Retrieve a list of surveys owned or shared with the authenticated user. Surveys contain pages and questions with various question types (multiple choice, matrix, open-ended, etc.). Surveys can be organized into folders, support multiple languages, and include custom variables. You can also access the survey template/question bank library.

### Survey Distribution (Collectors)

Collectors allow you to collect survey responses with a link to your survey. Many types of collectors are available through the API such as SMS, weblink, email, and general popup collectors. Weblink collectors give you a survey URL, email invitation collectors and SMS invitation collectors send survey invite messages via the messages endpoints, and popup collectors let you embed surveys on your website.

- Configure collector settings like close date, redirect URL, anonymity, response limits, and whether to allow multiple responses.
- Create/Modify Collectors requires a paid SurveyMonkey plan to create any collector that is not a weblink collector.

### Response Management

Retrieve a list of responses, create responses programmatically, or delete all responses from a collector. Retrieve full expanded responses including answers to all questions. Responses can be filtered by date, status, and other criteria.

### Contact Management

If your application is using email collectors or SMS collectors to collect survey responses, the contacts endpoints let you create contacts and contact lists to send survey invite messages to. You can create, update, delete, copy, and merge contact lists, as well as manage individual contacts within them.

### Invite Messages

Compose and send email or SMS invitation messages to contacts through collectors. Manage message recipients, customize message content and templates, and schedule sends.

### Results Sharing

Share survey results publicly or with specific users. Configure sharing options including summary/trends views, password protection, and branding.

### Team & Group Management

Retrieve a list of groups (teams). View group members and manage team-level settings. Requires a team/enterprise plan.

### Workgroups

Workgroups help organize team members collaborating on survey projects. Retrieve a list of all workgroups, and add shared resources to workgroups. Manage workgroup members, roles, and survey sharing privileges.

### User Information

Retrieve details about the authenticated user, including account type, plan details, available and granted scopes, and supported question types.

## Events

SurveyMonkey supports webhooks for real-time event notifications.

### Response Events

Create webhooks that subscribe to various events in SurveyMonkey. You can create a webhook to POST a callback when a survey response is completed (`response_completed`) or a survey response is disqualified (`response_disqualified`). Additionally, the `response_updated` event type is available.

- You can specify one or more survey IDs to be included.
- The subscription URL must be unique to each webhook you create and is not allowed to be associated with any other webhooks in your account, regardless of event type specified.
- The `subscription_url` must be accessible and return a successful status code (2xx) when pinged by SurveyMonkey. SurveyMonkey verifies the `subscription_url` by sending a HEAD request to it before registering the webhook.
- Requires the `webhooks_read` and `webhooks_write` scopes.
