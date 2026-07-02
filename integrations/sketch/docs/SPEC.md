I can see that Sketch primarily has a local JavaScript plugin API for the Mac app. Let me check if they have a cloud/web API (Sketch Cloud or Sketch for Teams) that would be more suitable for an integration platform.I see that Sketch's GraphQL API in the web app is internal-only and not publicly accessible. Let me check the Sketch Cloud API and webhooks more specifically.Based on my research, I now have a comprehensive understanding of Sketch's developer ecosystem. Sketch does **not** offer a public REST/GraphQL web API for cloud operations. It provides: a JavaScript Plugin API (runs inside the Mac app), a CLI tool (sketchtool), an open file format, an Action API for in-app events, and a URL scheme. There is no public cloud API, no OAuth, no webhooks, and no personal access tokens for remote API access.

# Slates Specification for Sketch

## Overview

Sketch is a macOS-native digital design application for UI/UX and product design, offering vector editing, prototyping, and collaboration via a cloud workspace. It provides developer extensibility through a JavaScript Plugin API that runs inside the Mac app, a command-line interface (sketchtool) for asset export and document inspection, and an open JSON-based file format for programmatic document manipulation. Sketch does not offer a public REST or GraphQL web API for remote cloud access.

## Authentication

The Sketch JavaScript API comes bundled inside the Sketch Mac app and requires no separate authentication — it runs in the context of the local application.

The CLI tool (sketchtool) is free to use but requires a valid Sketch license to run plugins.

Sketch does not provide a public cloud-facing API with standard authentication mechanisms (such as API keys, OAuth2, or personal access tokens). The GraphQL API used in the Sketch Web App is internal-only and not available for external use. All developer integrations are either local (via the Plugin API or CLI running on macOS) or file-based (by reading/writing the `.sketch` file format directly).

There is no remote HTTP API authentication to configure for third-party integrations.

## Features

### Document Manipulation (JavaScript Plugin API)

The official JavaScript API allows access to and modification of Sketch documents, provides data to Sketch users, and offers basic user interface integration. This includes:

- Accessing, modifying, and creating documents — everything from colors to layers and symbols.
- Saving custom data for a layer or document and storing user settings for a plugin.
- Providing image or text data right within Sketch via Data Suppliers, which integrate directly with the Sketch user interface.
- Working with libraries, importing symbols, layer styles, and text styles from shared libraries.
- Importing files as layers and exporting objects to supported file formats.

This API only runs within the Sketch Mac application and cannot be accessed remotely.

### Asset Export (CLI — sketchtool)

Sketch includes sketchtool, a command-line interface for integration into save-to-publish workflows. With sketchtool you can export artboards, layers, slices, pages and document previews, inspect documents, and run plugins.

- Supports export in multiple formats (PNG, JPG, SVG, PDF, etc.) and at multiple scales.
- Can inspect document metadata and dump the full document structure in JSON format.
- Requires macOS and the Sketch app to be installed, as the binary is located within the Sketch application bundle.

### Open File Format

Sketch documents are stored as ZIP archives containing JSON-encoded data. The file format allows for third-party integration — you can generate Sketch documents dynamically, read, or modify them without opening them in Sketch.

- The specification is published as JSON Schema, which can be used to generate types, GraphQL schemas, model code, or validate Sketch documents programmatically.
- TypeScript types are available via the `sketch-file-format-ts` npm package for strongly typing Sketch document data.
- This enables cross-platform, server-side processing of Sketch files without requiring macOS or the Sketch app.

### URL Scheme

Sketch supports integration via the `sketch://` URL scheme, which allows external applications to trigger actions within the Sketch Mac app, such as opening specific documents.

## Events

Sketch provides an Action API that lets plugins react to events in the app. Plugin authors can write code that is executed when certain actions are triggered.

An action is an event that happens in the app, usually as a consequence of user interaction. Actions have names like `CloseDocument`, `DistributeHorizontally`, or `TogglePresentationMode`, and plugins can run code when those actions are triggered.

These events are only available to plugins running inside the Sketch Mac application. They are not webhooks and cannot be subscribed to remotely. Sketch does not provide webhooks, server-side event subscriptions, or any remote event notification mechanism.

The provider does not support events accessible from an external integration platform.
