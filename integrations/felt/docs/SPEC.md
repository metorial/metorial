Now let me get more details on the webhook event types and the comments/users API sections:# Slates Specification for Felt

## Overview

Felt is a collaborative, web-based GIS (Geographic Information System) platform for creating, sharing, and managing interactive maps. Its REST API allows users to interact with the platform via code, performing actions such as creating new maps, adding data to maps, styling layers, and more. The API enables integration of Felt's mapping capabilities into external workflows, allowing manipulation of Maps, Layers, Elements, Sources, Projects and more.

## Authentication

Felt uses **API token (Personal Access Token)** authentication via Bearer tokens.

- All calls to the Felt API must be authenticated. The easiest way to authenticate is by creating an API token and providing it as a Bearer token in the request header.
- You can create an API token in the Developers tab of the Workspace Settings page. You can generate as many API tokens as you need.
- Tokens follow the format: `felt_pat_ABCDEFUDQPAGGNBmX40YNhkCRvvLI3f8/BCwD/g8`
- The token is passed as an `Authorization: Bearer <token>` header on every request.
- API tokens are created per-workspace. If you wish to interact with several workspaces via the Felt API, you must create a different API token for each one.
- The API base URL is `https://felt.com/api/v2/`.
- This feature is available to customers on the Enterprise plan.

## Features

### Map Management

Maps are the centerpiece of Felt. You can create, retrieve, update, delete, move, and duplicate maps programmatically.

- When creating a map, you can configure title, description, initial coordinates (lat/lon), zoom level, and public access level.
- Basemap options include "default", "light", "dark", "satellite", a custom raster tile URL, or a hex color string.
- Access levels include: private, view_only, view_and_comment, and view_comment_and_edit.
- Maps can be moved to a different project or folder within the same workspace.
- Maps can be duplicated with all their layers, elements, and configuration.

### Layer Management

Layers represent geographic data on a map. You can upload data, style layers, refresh live data, and organize layers into groups.

- Felt supports many kinds of file and URL imports, including GeoJSON, CSV, shapefiles, and live data feed URLs.
- Layers can be styled using the Felt Style Language (FSL), a JSON-based specification that controls color, opacity, size, stroke, legends, labels, and popups.
- You can set a schedule for layer refresh frequency, specify the geometry attribute, and update layer metadata.
- Layers can be organized into layer groups with names, ordering, and subtitles.

### Elements (Annotations)

Elements enable you to annotate maps with custom shapes, text, and markers. You can create, update, and delete map elements.

- Elements are represented as GeoJSON features and can include points, lines, polygons, notes, and text.
- Elements can be organized into element groups with custom colors and symbols.
- The maximum payload size is 1MB, and complex element geometry may be automatically simplified.

### Data Sources

You can configure data source connections, credentials, and sync settings to create live maps.

- Supported source types include S3 buckets, Azure Blob Storage, and others.
- Sources can be configured with credentials (e.g., AWS IAM roles, Azure connection strings, key pairs) for secure access.
- Sources support automatic syncing to keep map data up to date.

### Comments

The API allows reading and managing comments on maps, enabling collaboration among map viewers and editors.

### Users

You can retrieve information about users in your workspace.

### Embed Tokens

You can create short-lived (15-minute) tokens for authenticating visitors to view private embedded maps without being logged into Felt. You must provide a user_email to associate the token with the end user.

- Each end user should be a member of your Felt workspace with a viewer, editor, or admin role assigned.

### Project Organization

You can move maps to projects or folders programmatically, enabling automated organization of mapping assets.

## Events

Felt supports webhooks for receiving real-time notifications when maps change.

### Map Updates

You can trigger a workflow whenever something changes on a map. Instead of polling, you set up a webhook where Felt sends a notification any time a map is updated.

- Webhooks are configured per-map through the Webhooks tab in workspace settings.
- Workspace admins can set up webhooks in the Webhooks tab of their workspace.
- Updates are sent whenever something on the map changes, including adding elements, drawing annotations, changing colors, or updating sharing permissions.
- The webhook payload includes the event type (`map:update`), a timestamp, and the map ID.
- Webhooks are delivered as POST requests to the configured URL.
