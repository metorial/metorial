Based on my research, I now have a clear picture of Loom's developer capabilities. Let me compile the specification.

# Slates Specification for Loom

## Overview

Loom is a video messaging platform (now owned by Atlassian) that allows users to record their screen, camera, and microphone to create instantly shareable videos. It provides two client-side SDKs (recordSDK and embedSDK) for third-party integration but does not offer a public REST API for server-side operations.

## Authentication

Loom's SDKs support two authentication methods:

### Public App ID (SDK Standard)

- Register a developer account at the [Loom Developer Portal](https://loom.com/developer-portal).
- Two applications are created: a **sandbox** app (for localhost development) and a **live** app (for production domains).
- Apps are restricted to domains specified during registration.
- The SDK is initialized client-side using the `publicAppId` parameter. No server-side credentials are needed.

### Key-Pair Authentication (SDK Standard optional / SDK Custom required)

- A more secure method that uses signed JSON Web Tokens (JWS) verified via RSA key pairs.
- A PEM private key file is generated and downloaded from the developer dashboard. This key must be stored securely on your server.
- Your server signs short-lived JWS tokens (using RS256 algorithm) containing your Public App ID as the issuer (`iss`), an issued-at time (`iat`), and a short expiration (`exp`).
- The signed JWS token is passed to the SDK client-side instead of the public app ID.
- Loom uses the corresponding public key to verify incoming tokens.

**Note:** Loom does not offer an open REST API or OAuth2-based authentication for server-to-server API access. All developer access is through the client-side SDKs.

## Features

### Video Recording (recordSDK)

Allows embedding Loom's recording experience directly within a third-party web application. Users can record screen, camera, or both, similar to Loom's Chrome extension. The SDK provides lifecycle events such as `recording-start`, `recording-complete`, `insert-click`, `cancel`, and `complete`. After recording, a `LoomVideo` object is returned containing the video's ID, title, share URL, embed URL, thumbnail, and duration. Recordings by logged-in users are stored in their Loom workspace; guest recordings are stored in a workspace specific to the SDK application. Guests are limited to 5 recordings before being prompted to create a Loom account. The recordSDK depends on the browser's MediaRecorder API and third-party cookies, so browser compatibility should be checked using the `isSupported` method before setup.

### Video Embedding (embedSDK)

Enables converting Loom share URLs into rich embedded video players within any website or app. Provides several methods:

- **oembed**: Fetches video metadata (title, dimensions, thumbnail, duration, embed HTML) for a given Loom URL.
- **textReplace**: Finds and replaces Loom URLs within a text string with embed HTML.
- **linkReplace**: Targets DOM elements matching a CSS selector and replaces Loom links with embedded players.
- **gifEmbed**: Fetches a GIF embed code for a given Loom URL.

The embedded player handles authentication automatically, supporting playback of private and protected videos. Embed dimensions are responsive by default but can be set to fixed width/height.

### Video Metadata Retrieval

Through the embedSDK's oembed method, you can retrieve metadata about any Loom video including its title, thumbnail URL, thumbnail dimensions, video dimensions, duration, and provider information. This does not require any special authentication.

## Events

The provider does not support webhooks or server-side event subscriptions. The recordSDK provides client-side event emitters (e.g., `recording-start`, `recording-complete`, `insert-click`, `cancel`, `lifecycle-update`, `upload-complete`) that fire within the browser during the recording workflow, but these are not server-side webhook or polling mechanisms.
