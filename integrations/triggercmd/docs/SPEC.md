# Slates Specification for Triggercmd

## Overview

TRIGGERcmd is a cloud service that allows you to securely and remotely run commands on your computers. You can use your phone, Alexa, Google Assistant, IFTTT, Zapier, n8n, and many other methods to run your commands on your computers. Users install a TRIGGERcmd agent on their computers, configure commands locally, and then trigger those commands remotely via the web, REST API, or voice assistants.

## Authentication

TRIGGERcmd supports two authentication methods:

### OAuth 2.0

TRIGGERcmd uses OAuth authentication. This is the standard method used by third-party integrations (Pipedream, Make, Power Automate, etc.).

- **Authorization URL:** `https://www.triggercmd.com/oauth/authorize`
- **Token URL:** `https://www.triggercmd.com/oauth/token`
- The authorization request uses `response_type=code` with standard OAuth parameters (`client_id`, `redirect_uri`, `state`, `scope`).
- Token requests use `application/x-www-form-urlencoded` content type.

### Bearer Token (API Token)

For direct REST API usage, TRIGGERcmd supports authentication via a personal Bearer token. You will need your user token, which can be found at the bottom of your TRIGGERcmd profile page or the instructions page.

The token is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your_token>
```

Alternatively, for some endpoints (like the IFTTT webhook), the token can be passed in the POST body as `token=<your_token>`.

## Features

### Remote Command Execution

The core feature of TRIGGERcmd. TRIGGERcmd allows you to execute commands on your computers remotely through a REST API. A trigger request requires:

- **computer** (required): The name of a computer in your TRIGGERcmd account.
- **trigger** (required): The name of a command configured on that computer.
- **params** (optional): Parameters to pass to the command.

Your commands could install updates, open your garage, run a script, or anything else you decide. Commands are defined locally on each computer in a `commands.json` file and are not stored on TRIGGERcmd's servers.

### Computer Management

You can list your computers, list the commands for a given computer, and list all commands across all computers. The API provides endpoints to retrieve your registered computers and their associated commands.

### Command Run History

You can query run history for a specific command, including timestamps and status (e.g., "Command ran", "Trigger sent from website"). This requires the command ID and your token.

### Computer Sharing

You can share your computer with another TRIGGERcmd account by clicking the computer's yellow "Share" button and entering the other account's email address. After accepting, it shows up under "Other user's computers" and they can run that computer's commands.

### Bookmarks

You can create and share URLs that run your commands without authentication. You can set an optional timeout to make bookmark URLs expire. People can also scan your bookmark's QR code to run the command. There are two types: standard bookmarks (JWT-based, can expire) and short bookmarks (based on computer name and trigger name, more persistent).

## Events

The provider does not support events (webhooks or event subscriptions). TRIGGERcmd is designed as a command-execution service where external systems trigger commands on registered computers. It does not offer webhook callbacks or event subscription mechanisms for notifying external systems when commands are executed or when computer status changes.
