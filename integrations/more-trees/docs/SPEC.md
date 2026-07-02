Now let me check for the `viewCredits` and carbon offset endpoints mentioned in the Pipedream integrations:Now I have enough information to write the specification. Based on my research, I can see that:

1. More Trees has a public API with basic authorization (API keys)
2. Two types of keys: API Key (X-API-KEY header) and Public Validation Key (Authorization header)
3. Features: account info, forest info, project info, plant trees, view credits, get carbon offset
4. No evidence of webhooks or event subscriptions

# Slates Specification for More Trees

## Overview

More Trees (by THG Eco) is a platform that enables businesses and individuals to plant trees and purchase carbon credits through reforestation projects worldwide. It provides a public API to automate tree planting, retrieve project information, and track environmental impact statistics like CO2 captured and trees planted.

## Authentication

More Trees uses API key-based authentication. There are two keys used depending on the endpoint:

1. **API Key**: Used for account-specific operations (account info, planting trees). Passed via the `X-API-KEY` header.
2. **Public Validation Key**: Used for public/read-only operations (viewing credits, project information). Passed via the `Authorization` header.

Both keys can be found in the More Trees platform:

- **API Key** and **Account Code**: Available under _Settings → Account Settings_ at `https://platform.moretrees.eco/settings/?tab=account-settings`
- **Public Validation Key**: Available under _Integration → API_ at `https://platform.moretrees.eco/manage/API`

A More Trees account must be created and onboarding completed before API access is available. All requests use JSON (`Content-Type: application/json`).

## Features

### Account Information

Retrieve account details including account name, credit balance, forest name, and forest slug using the account code. The account code serves as the identifier for your organization on the platform.

### Forest Information

Get forest data including branding and plantation statistics. This returns the forest name, logo URL, brand color, and aggregate totals such as trees planted, trees gifted, trees received, CO2 captured, and number of projects supported. The forest can be looked up by account code or forest slug.

### Project Information

Get all active projects with details including name, ID, description, and country, along with a list of trees you can plant for that project. Each project includes type, supplier name, and image. Each tree within a project includes its name, description, CO2 sequestration in tonnes, credits required, and image. This information is needed to select a specific project and tree type when planting.

### Tree Planting

Send a request to plant a tree or multiple trees for yourself or for others. Key options include:

- **Plant for self**: Specify a quantity of trees to plant on your own account.
- **Plant for others (gifting)**: Provide an array of recipients, each identified by email or account code, with a name and quantity.
- **Project and tree selection**: Optionally specify a project ID and tree ID; defaults are used if omitted.
- **Test mode**: Enable a dry-run mode that validates the request without persisting changes.
- The response includes credits used and credits remaining.

### Credit Balance

View the current credit balance on your account. Credits are consumed when trees are planted, with each tree type requiring a specific number of credits.

### Carbon Offset

Get the total carbon offset. This allows you to retrieve your cumulative carbon offset figures based on your tree planting activity.

## Events

The provider does not support events. There are no webhooks or event subscription mechanisms available in the More Trees API.
