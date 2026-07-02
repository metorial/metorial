These results are mostly about Zapier's platform for building integrations (Developer Platform) and general API education content, not Zapier's own REST API for managing Zaps. Let me search for the actual Zapier API that allows programmatic management of Zaps and related resources.Let me fetch the actual Zapier API documentation pages for more details.Now I have enough information to write a comprehensive specification. Let me compile what I've learned about Zapier's API offerings.

# Slates Specification for Zapier

## Overview

Zapier is a no-code automation platform that connects thousands of cloud applications through automated workflows called "Zaps." It provides APIs for partners to embed Zapier's automation capabilities into their own products, enabling programmatic management of Zaps, app connections, and workflow steps. The platform offers both a Workflow API (for building and managing Zaps) and a legacy Partner API (for retrieving Zap templates and app directory data).

## Authentication

Zapier's API uses **OAuth 2.0** with the **authorization code grant type** for user-context operations, and **client credentials grant type** for app-level operations.

### Prerequisites

Your Client ID and Client Secret are only available after you've published your app as a public integration in Zapier's App Directory. Redirect URIs can be configured in the Zapier Developer Platform under Embed → Settings.

### OAuth 2.0 Authorization Code Flow

1. **Authorization Endpoint:** `https://api.zapier.com/v2/authorize`
2. **Token Endpoint:** `https://zapier.com/oauth/token/`

Initiate the OAuth flow by constructing a URL with your redirect URI, client ID, OAuth scopes, etc., and open a browser to that URL. Example:

```
https://api.zapier.com/v2/authorize
  ?response_type=code
  &client_id={YOUR_CLIENT_ID}
  &redirect_uri={YOUR_REDIRECT_URI}
  &scope={YOUR_OAUTH_SCOPES}
  &response_mode=query
  &state={RANDOM_STRING}
```

Exchange the authorization code for an access token with a POST request to `https://zapier.com/oauth/token/`. Client ID and secret can be passed either as a Basic Authentication header or as body parameters.

### OAuth 2.0 Client Credentials Flow

The client credentials grant exchanges the client credentials for an access token via a POST request to `https://zapier.com/oauth/token/`.

### OAuth Scopes

The various endpoints of the Zapier Workflow API require different OAuth scopes. Information on specific scopes required is included within the API reference for each endpoint. Known scopes include:

- `zap` — Read access to Zaps and apps
- `zap:all` — Read access to all Zaps across the account
- `zap:account:all` — Read access to owned and shared Zaps across the account
- `zap:write` — Create and modify Zaps and workflow steps
- `connection:read` — Read access to app authentications
- `connection:write` — Create new app authentications
- `zap:runs` — Read access to Zap run history
- `action:run` — Create and retrieve asynchronous Action Runs

### Token Usage

All API requests require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

The base URL for API requests is `https://api.zapier.com`.

## Features

### App Directory Browsing

Retrieve the list of apps available on Zapier's platform. Apps can be searched by title, category, or whether they appear in a specific Zap template. Useful for building integration marketplaces within your own product.

### Zap Management

Retrieve a list of Zaps for the authenticated Zapier user. The response can be expanded to include full objects, and Zaps can be filtered by certain input criteria. Zap data includes enabled/disabled status, last successful run date, step details, and editor links.

### Zap Creation

To build a Zap, you need to select an Action, Authentication, and Inputs for each step. The API allows you to:

- Browse available actions (triggers and actions) for a given app
- Retrieve input fields and choices for each action
- Retrieve output fields from one step for mapping to subsequent steps
- Test individual steps before creating the Zap
- Create a fully configured Zap via the POST /zaps endpoint once all steps are defined.

The Workflow API for creating Zaps is only available to developers with a public integration on the Zapier platform.

### Authentication Management

An Authentication contains various fields, often credentials such as API tokens, used to access partner APIs on behalf of a user. The actual fields are held securely by Zapier. You can list existing authentications and create new ones programmatically for apps that support API key-based auth.

- Creating authentications for OAuth-based apps requires redirecting the user through a browser-based flow.

### Workflow Steps

Create a new Workflow Step based on a single provided step, which returns a webhook URL that can be used to invoke the Workflow Step and retrieve a response. Field values can be hardcoded or contain mapped values surrounded with double curly braces. This enables executing individual actions on demand via webhook invocation.

### Action Runs

Create one-off asynchronous Action Runs for selected actions without creating a saved Zap, then retrieve the run by ID to inspect queued/running/success/error state, results, and errors. Zapier currently documents Action Runs as limited beta API access.

### Zap Templates

Retrieve pre-built Zap templates for your integration. Templates can be fetched for your integration, and the returned list can be customized using query string parameters. Templates can be used to suggest popular automations to users.

### Zap Run History

Retrieve execution history for Zaps, allowing you to monitor the status and outcomes of automated workflows.

### Categories

Retrieve a list of all supported Zap categories, allowing you to explore and understand the different categories of Zaps available.

### Embedded Editor

Zapier provides an embeddable Zap editor that can be integrated into your product via iFrame. The Pre-filled Zap Generator allows constructing URLs with field values as parameters, which direct users to the Zap Editor with some input fields already filled out. These URLs can be placed inside your product within an embedded Zap Editor.

## Events

The provider does not support webhooks or event subscriptions for listening to changes on Zapier resources (such as Zap status changes or execution events) via the API. Zapier is primarily an event _producer_ — it receives webhooks from other services and triggers workflows, but does not expose a webhook subscription mechanism for its own platform events.
