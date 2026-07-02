Now let me look at the specific details about note sharing, search, ENML, and synchronization features:Now I have enough information to write the specification.

# Slates Specification for Evernote

## Overview

Evernote is a note-taking and organization service that allows users to create, store, and manage notes, notebooks, tags, and file attachments. Evernote provides two main APIs: the Local API (for interacting with local Evernote clients) and the Cloud API (for speaking directly to the Evernote web service). The Cloud API is comprised of two logical services: the UserStore (which manages user accounts) and the NoteStore (which manages the contents of a user's account).

## Authentication

Evernote supports two authentication methods:

### OAuth 1.0a (Recommended for Production)

The OAuth flow is the process a user goes through to authorize your application to access their Evernote account on their behalf. Evernote uses **OAuth 1.0a** (not OAuth 2.0, despite some third-party sources claiming otherwise). Evernote uses OAuth 1.0 for its authentication workflow.

**Credentials required:**

- **Consumer Key** and **Consumer Secret** (collectively called an "API Key"), obtained by submitting a request to Evernote's developer support team.

**Endpoints:**

- Request Token URL: `https://www.evernote.com/oauth`
- Authorization URL: `https://www.evernote.com/OAuth.action`
- Access Token URL: `https://www.evernote.com/oauth`

**Flow:**

1. Retrieve a request token from the Evernote Cloud API. This token is used to request an authentication token. Using the request token, send the user to the Evernote site where they will authenticate.
2. After approval is granted, Evernote will redirect the user back to your application along with the information required to retrieve an access token.
3. Exchange the temporary token and `oauth_verifier` for a permanent access token.

**Token expiration:** By default, access tokens are valid for 1 year. The user can alter this duration to 1 day, 1 week, or 1 month.

**Permission levels:** When you request an API key, you choose the access permissions: Basic access (create new content only), Full access (create, read, and update notes, notebooks, and tags), or App Notebook (full access sandboxed to a single notebook). Full access or app notebook API keys require justification when requesting activation on production.

### Developer Tokens (Development Only)

There are two ways to authenticate: developer tokens and OAuth. Developer tokens provide instant access to your Evernote account via the API. For public applications, webhook notifications, and advanced permissions, OAuth is recommended.

Developer tokens can be obtained from the sandbox environment and behave like OAuth access tokens but are limited to the developer's own account.

## Features

### Note Management

The NoteStore is used to create, update, and delete notes, notebooks, and other Evernote data found in a user's account. Notes use Evernote's own markup language called ENML (a subset of XHTML). Notes can include reminders, be marked as read-only by third-party apps, and be linked to other notes via note links. Applications can also store custom application-specific data on notes.

- The `expunge` functions (permanent deletion) are not available to third-party developers.

### Notebook Management

Users' notes are organized into notebooks. The API allows creating, listing, updating, and deleting notebooks. The API also supports accessing LinkedNotebooks — notebooks owned by another user that have been shared with the current user. App Notebook mode restricts an integration to a single notebook.

### Sharing

Single notes can be shared publicly using a public note URL. Anyone who knows the URL for a shared note can view it. Notebooks can also be shared with other Evernote users, providing read or read/write access to the shared notebook's contents.

### Tags and Saved Searches

Notes can be organized using tags. The API supports creating, listing, updating, and deleting tags, as well as associating tags with notes. Users can also create and manage saved searches that store frequently used search queries.

### File Attachments (Resources)

A note can have zero or more resources attached to it, with each resource containing the binary contents of the file and a set of optional metadata attributes such as the filename. A resource is attached to a note by including it in the Note.resources list and referencing the resource from the note's ENML content. Evernote performs optical character recognition on image attachments, making text in images searchable. Thumbnails can be generated for resources.

### Search

The API provides powerful search functions that allow you to search for notes within a user's account. You can search the full text of notes, or search by specific metadata such as notebook, note title, tag, date, or location. The search grammar also supports finding related notes. Searches can be filtered by notebook, tags, and whether to include trashed notes.

### Synchronization

Evernote client apps keep a full local copy of a user's account metadata. This is called synchronization. Most third-party applications don't need this, but in rare cases, you might want to build a synchronizing client. The API provides an incremental sync mechanism using update counts to efficiently detect changes.

### Evernote Business

The API supports both personal and business accounts, with some additional capabilities specific to Evernote Business. Business accounts can access business notebooks and business-specific data through a dedicated Business NoteStore.

## Events

Evernote supports webhooks for receiving real-time notifications about changes in user accounts.

### Note Change Notifications

Notifications are delivered in real-time. Notifications are sent for all users who have an unexpired OAuth session with your API key. Notifications are sent as HTTP GET requests.

The notification includes the numeric user ID, the GUID of the affected notebook, and the reason for notification. For operations relating to individual notes, the GUID of the note is also included.

**Reason codes include:**

- `create` — a note was created
- `update` — a note was updated
- `business_create` — a Business note was created
- `business_update` — a Business note was updated

**Filtering:** A filter can be configured on your API key to restrict notifications. For example, the filter `resource:image/*` causes notifications only when a note containing an image is created or updated. The filter supports Evernote's full search grammar.

**Registration:** To register for webhooks, open a developer support ticket and provide your API consumer key, the notification URL, and an optional filter. Webhook registration is not self-service; it requires manual setup by Evernote's team.

**Limitations:**

- The webhook payload does not include full change data. You must call the API to retrieve the actual note content after receiving a notification.
- For Evernote Business, third parties will only be notified of changes made to Business data by users who have authorized the integration.
- The filter is set at the API key level and applies to all users.
