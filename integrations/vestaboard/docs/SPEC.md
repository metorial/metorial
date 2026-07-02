# Slates Specification for Vestaboard

## Overview

Vestaboard is a smart display device (split-flap or e-ink style board) that shows messages composed of characters arranged in a grid. It provides APIs to programmatically read and write messages to the board, either via cloud services or directly over a local network. The board supports the Flagship model (6 rows × 22 columns) and the smaller Vestaboard Note (3 rows × 15 columns), as well as Note Arrays combining multiple Notes.

## Authentication

Vestaboard offers three distinct API interfaces, each with its own authentication method:

### 1. Cloud API (Read/Write API)

- **Method:** API Token (bearer-style header)
- Users can create and manage multiple API tokens via the Settings section of the mobile app or from the Developer section of the web app.
- Each token is specific to your Vestaboard and can be configured with granular permissions, such as Read and Write access.
- Tokens are encrypted in the database and will only be displayed once upon creation, so be sure to save them in a secure location.
- The token is passed via the `X-Vestaboard-Token` header.
- **Base URL:** `https://cloud.vestaboard.com/`

### 2. Subscription API

- **Method:** API Key + API Secret pair
- An API secret and key is required to get subscriptions or send messages. These credentials can be created from the Developer section of the web app.
- Credentials are passed via `x-vestaboard-api-key` and `x-vestaboard-api-secret` headers.
- The Subscription API is designed for writing to one or more boards based on a subscription ID. It's suited for making an installable or other extension that writes to multiple boards.
- **Base URL:** `https://subscriptions.vestaboard.com/`

### 3. Local API

- **Method:** Local API Key (obtained via one-time enablement)
- You make an API request to your Vestaboard to enable the local API. This is a one-time API call that will enable your local API and respond with an API token you can use to authenticate all of your future requests.
- The enablement requires a special enablement token provided by Vestaboard via email. You POST this token using the `X-Vestaboard-Local-Api-Enablement-Token` header to `http://vestaboard.local:7000/local-api/enablement`, which returns a permanent API key.
- Subsequent requests use the `X-Vestaboard-Local-Api-Key` header.
- **Base URL:** `http://vestaboard.local:7000/`

## Features

### Send Messages

Display messages on a Vestaboard by sending either plain text strings or precise character code arrays. Messages can be posted as either text strings or two-dimensional arrays of character codes representing the exact positions of characters on the board. If text is specified, the lines will be centered horizontally and vertically. Character codes include letters, numbers, punctuation, and colored blocks (red, orange, yellow, green, blue, violet, white). A `forced` flag can override configured quiet hours.

### Read Current Message

Retrieve the current message displayed on the board. The response returns the character code layout as a 2D array. Available on both the Cloud API and the Local API.

### Manage Transition Effects

Configure how the board animates between messages. Supported transition types are `classic`, `wave`, `drift`, and `curtain`, each with speed options of `gentle` or `fast`. Only available via the Cloud API for Flagship and Vestaboard Note devices (not Note Arrays).

### VBML (Vestaboard Markup Language)

VBML is a JSON-based format for composing messages to display on your Vestaboard. It supports multiple components with layout styling (justify: left/right/center/justified; align: top/bottom/center), dynamic props for templated content (e.g., `{{propName}}`), and absolute positioning. You can use the VBML endpoint to format any message by POSTing to `https://vbml.vestaboard.com/compose`. The API endpoint will respond with an array of arrays of Vestaboard character codes. A simpler format endpoint at `https://vbml.vestaboard.com/format` converts plain text to character code arrays. VBML does not require authentication.

### Subscription Management

Via the Subscription API, list all board subscriptions associated with your API credentials and send messages to specific subscriptions. This endpoint lists all Subscriptions to which the Viewer authenticated via the API key and secret has access. This is useful when managing messages across multiple boards.

### Note Array Support

If you are sending messages to a Note Array, the message will be split up into pieces and distributed to each board in the Note Array. For example, if you have a 2x2 Note Array of Vestaboard Notes, you are expected to send a 30x6 array of arrays.

## Events

The provider does not support events. Vestaboard's API does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
