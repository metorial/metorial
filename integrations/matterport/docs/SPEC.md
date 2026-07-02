Now let me get more details on the webhook event types and OAuth support.Let me get more details on the OAuth implementation and scopes.Now I have comprehensive information to write the specification.

# Slates Specification for Matterport

## Overview

Matterport is a 3D spatial data platform that allows users to capture, process, and manage digital twins of physical spaces. It provides APIs to programmatically manage 3D models/spaces, their metadata, assets (such as floor plans, point clouds, OBJ meshes, panoramic imagery), and account-level resources. The API uses a GraphQL interface with a single endpoint.

## Authentication

Matterport supports two authentication methods:

### 1. API Token (Basic Auth)

You need to generate an API key that allows you to connect to API endpoints. You can generate up to five keys. Tokens are managed in the Matterport Cloud portal at `my.matterport.com` under **Settings > Developer Tools > API Token Management**.

When you create a new key, you are presented with a **Token ID** (visible on the settings page) and a **Token Secret** (presented only once, so save it securely).

Authentication is done via HTTP Basic Auth, where the Token ID is used as the username and the Token Secret as the password. The API endpoint is `https://api.matterport.com/api/models/graph`.

API keys are "admin" or "all-access" keys, meaning they grant administrative credentials to the customer account. Developers can perform all administrative functions using the API, including archiving models and purchasing floorplans and MatterPaks.

You need to have a developer tools license on any Enterprise SaaS Tier. If you do not currently have a Developer Tools license, contact your Enterprise account manager. Note that accounts only have Sandbox mode enabled by default.

### 2. OAuth 2.0 (Authorization Code Flow)

OAuth is available for third-party partner applications to access Matterport users' accounts on their behalf. It follows the standard OAuth 2.0 Authorization Code flow. **Note:** OAuth is currently offered by invitation only for Commercial Partners with a Developer Tools Production License.

- **Authorization URL:** `https://authn.matterport.com/oauth/authorize`
- **Token URL:** `https://api.matterport.com/api/oauth/token`

The authorization request requires `client_id`, `response_type=code`, and `scope` parameters.

The token exchange uses `grant_type=authorization_code` with the authorization code, scope, client_id, and client_secret. The response includes an `access_token` (Bearer token), `expires_in`, and `refresh_token`.

If a refresh_token is 24 hours or older, it will become 'stale' when it is next used, and a new refresh_token will be provided when a new access_token is requested.

**Available OAuth scopes:**

| Scope            | Description                                       |
| ---------------- | ------------------------------------------------- |
| `ViewDetails`    | Search for models and view public/private details |
| `EditDetails`    | Edit basic details of a model                     |
| `DownloadAssets` | Download purchased add-ons and colormap imagery   |
| `PurchaseAssets` | Purchase assets for a model on the user's behalf  |

## Features

### Model Data Management

Search, read, and change model data, including model details like the name and address of the space, sharing URLs, images, videos, position data, the OBJ mesh file, the point cloud file, panoramic imagery, position points, and Tags. This is the core Model API, available to users at all account levels.

- Query and search across all models in an account.
- Update model details such as name, description, address, and publication info.
- Manage model visibility (private, public, unlisted).
- Manage model activation state (active, archived, pending).

### Tags (Mattertags) Management

Create, edit, delete, and move annotation tags on 3D models programmatically. Tags can contain text, links, and rich media and are tied to specific positions within a 3D space.

### Asset Access and Ordering

Programmatically discover, place orders, and access value-added services offered by Matterport. This includes purchasing and downloading add-ons such as floor plans, MatterPaks (bundled 3D assets), and point cloud files.

### Panoramic Imagery

Access panoramic images as skybox sets (six cube-face images). Each panorama includes position and rotation data. Available in up to 4K resolution.

### Geographic Coordinates (Enterprise)

Extract and modify geographic coordinates (latitude, longitude, and altitude) for Matterport models. This is an Enterprise-only extension to the Model API.

### Folder Management (Enterprise)

Manage folders, move models between folders, and query models by folders. Available as an extension to both Model and Account APIs for Enterprise customers.

### Account Management (Enterprise)

Manage users, invite new users, update permissions, and manage SDK keys. This is an Enterprise-only Account API.

### Import API (Enterprise, Beta)

Send collections of panoramic images directly into the Matterport vision pipeline for 3D reconstruction. Along with panoramic images, developers can send additional metadata, like pano sequences, floor data, and position data. The more metadata provided, the higher the chances of a successful 3D reconstruction.

### Private Model Embed (Enterprise)

Create private model embed links with a short-lived access token for displaying models within a private Intranet.

### Property Intelligence

Access AI-derived spatial intelligence data for models, including dimension estimates, automated room name classification, and vector data (2D floor plan geometry).

### Views and Layers

Manage custom views and visual layers within 3D models to control what users see during navigation.

### Custom Roles

Define and assign custom roles with granular permissions for API access within an organization.

## Events

Matterport supports webhooks (v2) for receiving real-time notifications about model events. Webhooks are triggered by events rather than requests. Matterport's webhook framework lets you subscribe to events so that you can get real-time notifications and updates, instead of repeatedly polling.

**Note:** Webhooks are only available for Enterprise-level Matterport subscriptions. Callbacks are registered and managed through GraphQL mutations on the Model API.

### Model Lifecycle Events

Events related to the creation, deletion, and restoration of models:

- **created** — A model has been created after upload. Includes the creation type (copy, demo, transfer, processing, or unknown).
- **deleted** — A model has been deleted.
- **restored** — A model has been restored.
- **processed** — A model has completed processing. Includes success/failure status.

### Model State Change Events

Events related to changes in model status and visibility:

- **activation_state_changed** — The activation state of the model changed (active, archived, or pending). Includes previous and current state.
- **visibility_changed** — A model's privacy setting has changed (private, public, unlisted). Includes previous and current visibility.

### Model Details Changed

- **details_changed** — A model's details have been modified (e.g., name, description, address, image, MLS info, publication metadata). Includes previous and current values. Note: this event is not propagated until model processing completes.

### Model Transfer Events

Events related to models being moved between accounts:

- **transferred_in** — A model has been transferred into your account. Includes the source organization ID.
- **transferred_out** — A model has been transferred out of your account. Includes the destination organization ID.

### Add-On Bundle Events

- **bundle_updated** — The state of an add-on bundle for a model changed (requested, delivered, canceled, or failed). Includes the bundle ID.
