Now let me look for more details about SmugMug API resources and check if they support webhooks.# Slates Specification for SmugMug

## Overview

SmugMug is a photo hosting and sharing platform for photographers, offering image and video storage, organization into albums and folders, and online selling of prints. It is a cloud-based software designed to help freelancers, professional photographers, and studios upload, store, share and sell images, with capabilities for creating personalized digital stores and websites. The API provides programmatic access to a user's SmugMug account, allowing them to manage photos, albums, and account settings.

## Authentication

SmugMug uses **OAuth 1.0a** for authentication. The SmugMug API uses OAuth1, with request signing handled as part of the authentication process.

### Prerequisites

- You must be logged in with a SmugMug account to apply for an API key.
- Each individual application or use of the API should use its own key.
- Apply for an API key at `https://api.smugmug.com/api/developer/apply`, which provides both an **API Key** (Consumer Key) and an **API Secret** (Consumer Secret).

### OAuth 1.0a Flow

The three-legged OAuth 1.0a flow uses these endpoints:

1. **Request Token**: `https://secure.smugmug.com/services/oauth/1.0a/getRequestToken` — Obtain an unauthorized request token. An `oauth_callback` parameter is required.
2. **User Authorization**: `https://api.smugmug.com/services/oauth/authorize.mg` — Redirect the user to authorize the application.
3. **Access Token**: `https://secure.smugmug.com/services/oauth/1.0a/getAccessToken` — Exchange the authorized request token for an access token.

### Authorization Parameters

The application can request specific Access (Public [default] or Full) and Permissions (Read [default], Add or Modify) for a user's account by including `Access` and `Permissions` parameters in the authorization URL.

- **Access**: `Public` (default) — only public content; `Full` — all content including private.
- **Permissions**: `Read` (default) — read-only; `Add` — read and create; `Modify` — read, create, update, and delete.

### Token Behavior

- OAuth tokens don't expire unless the user manually de-authorizes them through SmugMug Account Settings.
- If you are only accessing your own data, SmugMug automatically generates an access token and secret which can be found in account settings under the privacy section > Authorized Services.

### Public Access

An API Key alone (without OAuth access tokens) can be used to access publicly available data. Full OAuth authentication is required for private data and write operations.

## Features

### Node Management (Folders, Albums, Pages)

A node is a folder, album, or page. Folders contain albums, pages, and other folders, and albums contain images. The API allows creating, reading, updating, and deleting nodes in a hierarchical structure.

- Nodes can be of type Folder, Album, or Page.
- There is a limit to how deep the folder hierarchy can be — the root can contain folder trees up to five folders deep.
- Supports sorting, searching, and traversing the node tree.

### Album Management

The album endpoint provides access to album settings and album contents. Albums are also known as galleries.

- Create, update, and delete albums within folders.
- Configure album settings including privacy (Private, Unlisted, Public), password protection, watermarks, printmarks, download permissions, EXIF display, commenting, and searchability.
- Apply album templates and set highlight/cover images.
- Move or collect images across albums.

### Image and Video Management

An image is a photo or video stored on SmugMug.

- Upload images and videos to albums via a dedicated upload endpoint (`https://upload.smugmug.com/`).
- Upload from local files or from external URLs.
- Replace existing images with new files.
- Retrieve image metadata, EXIF data, and multiple size variants.
- Update image properties such as title, caption, and keywords.
- Delete images and move images between albums.
- Download original/archive images.

### User and Profile Management

Retrieve and manage user account information and public-facing profile data.

- A user profile includes social networking links, biographical text, and bio and cover images.
- Access user-level resources such as featured albums, recent images, popular media, geo-tagged media, and top keywords.
- Manage site settings for the user's SmugMug site.

### Search

Search across the user's content including albums, images, and nodes.

- Text-based search scoped to a user, album, node, or folder.
- Search for albums and images with configurable sort direction and method.

### Comments

Retrieve and manage comments on albums and nodes.

### Watermarks

Manage watermark images that can be applied to albums for display on photos.

### Sharing

Access share URIs for albums to facilitate sharing of galleries with others.

## Events

The provider does not support events. SmugMug's API v2 does not offer webhooks or a purpose-built event subscription mechanism.
