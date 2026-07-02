# Slates Specification for OneNote

## Overview

Microsoft OneNote is a digital note-taking application that is part of the Microsoft 365 suite. Microsoft Graph lets your app get authorized access to a user's OneNote notebooks, sections, and pages in a personal or organization account. The location can be user notebooks on Microsoft 365 or consumer OneDrive, group notebooks, or SharePoint site-hosted team notebooks on Microsoft 365.

## Authentication

OneNote is accessed through the Microsoft Graph API and uses **OAuth 2.0** for authentication.

**Registration:**

- Register your application in the Microsoft Entra ID (Azure AD) portal to obtain a **Client ID** and **Client Secret**.
- Configure a **Redirect URI** for the OAuth flow.
- For multi-tenant apps, the app can be configured to accept sign-ins from external Azure tenants.

**Endpoints:**

- Authorization: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
- Token: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
- The `{tenant}` value can be `common` (both personal and organizational accounts), `organizations`, `consumers`, or a specific tenant ID/domain.

**Authentication type:**

- The Microsoft Graph OneNote API will no longer support app-only authentication effective March 31, 2025. It is recommended to use delegated authentication. This means a signed-in user context is required.

**Scopes (Permissions):**

The following delegated permission scopes are relevant for OneNote:

| Scope                 | Description                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `Notes.Read`          | Read-only access to all OneNote notebooks owned by or shared with the authenticated user.                |
| `Notes.ReadWrite`     | Modification of existing OneNote content. This scope implicitly includes all capabilities of Notes.Read. |
| `Notes.Create`        | Allows creation of new OneNote entities. This is separate from modification permissions.                 |
| `Notes.Read.All`      | Read all OneNote notebooks the signed-in user has access to in the organization.                         |
| `Notes.ReadWrite.All` | Read, share, and modify OneNote notebooks that the signed-in user has access to in the organization.     |

Additionally, request `offline_access` to obtain a refresh token for persistent access.

## Features

### Notebook Management

Create, list, and retrieve OneNote notebooks. Notebooks can be located on user OneDrive (personal or business), Microsoft 365 group notebooks, or SharePoint site-hosted team notebooks. Notebooks can also be copied to other locations (e.g., another user's OneDrive or a group).

### Section and Section Group Management

Organize notebooks with sections and section groups. Sections can be created, listed, and retrieved within notebooks. Section groups provide an additional level of hierarchy for organizing sections within a notebook. Sections can be copied to other notebooks or section groups.

### Page Creation and Content Management

Create a OneNote page by sending a POST request to a pages endpoint, then send the HTML that defines the page in the message body. Pages support rich content including:

- HTML, embedded images (sourced locally or at a public URL), video, audio, email messages, and other common file types.
- OneNote can render webpages and PDF files as snapshots. Microsoft Graph supports a set of standard HTML and CSS for page layout.
- Multipart requests for embedding binary images and files alongside HTML content.

Pages can also be updated using patch operations that target specific elements within a page (append, replace, insert, delete content). Not all HTML elements are supported; Microsoft Graph accepts a limited set of HTML that fits how people use OneNote.

### Content Retrieval and Search

Retrieve notebook structure (notebooks, sections, section groups) and page content (as HTML). Supports querying with OData filter, select, expand, and orderby expressions. The OneNote APIs in Microsoft Graph run OCR on images, support full-text search, auto-sync clients, process images, and extract business card captures and online product and recipe listings.

- Page previews return a text snippet (up to 300 characters).
- Page HTML content can be retrieved with element IDs for targeted updates.

### Copying Notebooks, Sections, and Pages

To copy a OneNote notebook, section, or page, you send a POST request to the respective copy action endpoint. Content can be copied across notebooks, sections, and section groups, including to different user locations, groups, or SharePoint sites.

### Accessing Other Users' and Group Notebooks

Access notebooks via `me/onenote` for the current user's content, or `users/{id}/onenote` for content that the specified user has shared with the current user. Group notebooks are accessible via `groups/{id}/onenote`, and SharePoint site notebooks via `sites/{id}/onenote`.

## Events

The OneNote API does not have native webhook support or an event subscription system. Microsoft Graph, which includes OneNote functionality, does offer webhooks and subscriptions for various services, but OneNote is not currently among them.

The OneNote Webhooks API endpoint supporting consumer Notebooks was deprecated and decommissioned on June 16th, 2023.

The provider does not support events.
