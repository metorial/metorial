# Slates Specification for Netlify

## Overview

Netlify is a cloud platform for building, deploying, and hosting web applications and sites. It is a hosting service for the programmable web that provides an API to handle atomic deploys of websites, manage form submissions, inject JavaScript snippets, and much more. The API is REST-style, uses JSON for serialization, and OAuth 2 for authentication.

## Authentication

Netlify supports two authentication methods:

### Personal Access Tokens (PATs)

For personal use, scripts, and automation. Generate a PAT from the Netlify dashboard under Applications > Personal access tokens by selecting "New access token." You can select an expiration date for your token. To authenticate API requests, include the token in the authorization header: `Authorization: Bearer <YOUR_PERSONAL_ACCESS_TOKEN>`.

If your team requires SSO login, personal access tokens are denied access to the team by default, but you can grant access when generating a new token (you must be logged in with SSO).

### OAuth 2.0 (Authorization Code Flow)

For public integrations, you must use OAuth2, which allows users to authorize your application without sharing sensitive credentials. You need an application client key and a client secret.

- **Register an OAuth App**: Register a new application in your Netlify user settings for OAuth applications. Set the redirect URI to your callback URL.
- **Authorization URL**: `https://app.netlify.com/authorize?client_id={client_id}&response_type=code&state={state}&redirect_uri={redirect_uri}`
- **Token Exchange Endpoint**: Perform a code-token exchange by POSTing to `https://api.netlify.com/oauth/token` with parameters `grant_type=authorization_code`, `code`, `client_id`, `client_secret`, and `redirect_uri`.
- Use the returned `access_token` as a Bearer token to access the Netlify API on behalf of the user.

**Base URL**: `https://api.netlify.com/api/v1/`

Netlify's OAuth does not define granular scopes for its own API — tokens grant full access to the authenticated user's account.

## Features

### Site Management

Create, update, configure, list, and delete sites (projects). Manage site settings including build configuration, repository linking, and custom domains. Manage sites, deploys, DNS, and more programmatically.

### Deploys

The most common API action is doing deploys, either of a new site or an existing site. Deploy via two methods: sending a file digest (SHA1 hashes) and uploading only new files, or sending a ZIP file of the entire site. You can also deploy serverless functions alongside your site.

### Environment Variables

Manage environment variables for an account or site. Create, read, update, and delete environment variables. Variables can have different values per deploy context (e.g., production, deploy previews, branch deploys).

### Form Submissions

Access all Netlify Forms metadata and submissions for a site. List verified and spam submissions, change submission state between spam and verified, delete individual submissions, and delete entire forms.

### DNS Management

Programmatically manage DNS records using the Netlify API. Create, list, and delete DNS records for domains using Netlify DNS. Manage DNS zones associated with your team.

### Snippet Injection

Each snippet can specify code for all pages and code that gets injected into "Thank you" pages shown after a successful form submission. Add, list, update, and delete JavaScript or HTML snippets that are injected into your site's pages. Configure injection position as `head` or `footer`.

### Split Testing

Create, manage, enable, and disable split tests (A/B tests) for a site. Split tests allow you to route traffic between different branches of your site.

### Notification Hooks

Netlify can trigger webhooks, send email notifications, or send Slack messages on certain events. The `/hooks` endpoint lets you control the hooks for your site. Create, list, update, and delete hooks for deploy events and form submission events.

### CDN Cache Purging

Purge cached content from Netlify's CDN.

### Site Assets (Large Media)

Manage assets for sites using Netlify Large Media. Create, list, update, and delete site assets, and retrieve public signatures for assets.

## Events

Netlify supports outgoing webhooks (notifications) that send event data as HTTP POST requests to a configured URL.

### Deploy Events

Outgoing webhooks send event information to an arbitrary URL using a POST request, with the body containing a JSON representation of the object relevant to the event. Available deploy events:

- **Deploy started**: emitted when Netlify starts building your site for a new deploy.
- **Deploy succeeded**: emitted when Netlify finishes uploading a new deploy to the CDN.
- **Deploy failed**: emitted when a deploy does not complete.
- **Deploy deleted**: emitted when a deploy is manually deleted.
- **Deploy locked**: emitted when the site is locked to a published deploy, stopping auto publishing.
- **Deploy unlocked**: emitted when deploys are unlocked, resuming auto publishing.
- **Deploy request pending**: emitted when an untrusted deploy requires approval.
- **Deploy request accepted**: emitted when an untrusted deploy request is accepted.
- **Deploy request rejected**: emitted when an untrusted deploy request is rejected.
- **Deploy restored**: emitted when a deploy is manually published (usually for rollback or rollforward).

### Form Submission Events

Notifications can be set up for form submissions using webhooks. Notifications can be configured for verified submissions to a specific form or for all verified submissions to any form on your site.

### Webhook Security

If you provide a JWS secret token for an outgoing webhook, Netlify will generate a JSON Web Signature (JWS) and send it in the `X-Webhook-Signature` request header. Hooks can be managed programmatically via the `/hooks` API endpoint, allowing you to configure the event type, target URL, and optional form filter.
