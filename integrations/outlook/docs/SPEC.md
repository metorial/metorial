# Slates Specification for Microsoft Outlook

## Overview

Microsoft Outlook is a personal information management service from Microsoft, accessible via the Microsoft Graph API. The data includes calendar, mail, and personal contacts stored in a mailbox in the cloud on Exchange Online as part of Microsoft 365, or on Exchange on-premises in a hybrid deployment. Microsoft recommends using Microsoft Graph to access Outlook mail, calendar, and contacts.

## Authentication

Microsoft Outlook uses **OAuth 2.0** exclusively for authentication, via the Microsoft identity platform (Microsoft Entra ID, formerly Azure AD).

### Prerequisites

1. **App Registration**: Register your application in the Azure Portal under Microsoft Entra ID → App Registrations. You will receive a **Client ID** (Application ID) and must generate a **Client Secret** or certificate.
2. **Account Type**: Choose the Outlook auth method that matches the app registration audience. **Work & Personal** uses the Microsoft identity `common` authority, and **Work Only** uses the `organizations` authority.

### OAuth 2.0 Flows

Microsoft Graph supports two access scenarios: **delegated access** (app calls on behalf of a signed-in user) and **app-only access** (app calls with its own identity, without a signed-in user). Delegated permissions (also called scopes) work in the delegated scenario, while application permissions work in the app-only scenario.

- **Authorization Code Flow** (delegated): For apps with a signed-in user.
  - Authorization endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
  - Token endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
- **Client Credentials Flow** (app-only): For background services without a signed-in user. Uses `https://graph.microsoft.com/.default` as the scope.

### Required Credentials

- **Client ID**: From your app registration.
- **Client Secret** (or certificate): Generated in the app registration under "Certificates & secrets".
- **Redirect URI**: Configured in the app registration.

### Scopes

Scopes are requested as space-separated values in the `scope` parameter. Common Outlook-related scopes include:

- **Mail**: `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `Mail.ReadBasic`, `Mail.Read.Shared`, `Mail.Send.Shared`
- **Calendar**: `Calendars.Read`, `Calendars.ReadWrite`, `Calendars.Read.Shared`, `Calendars.ReadWrite.Shared`
- **Contacts**: `Contacts.Read`, `Contacts.ReadWrite`
- **Tasks (To Do)**: `Tasks.Read`, `Tasks.ReadWrite`
- **General**: `User.Read`, `offline_access` (for refresh tokens), `openid`, `profile`, `email`

With the v2.0 endpoint, you specify the `offline_access` scope to explicitly request a refresh token.

For application permissions (app-only), the same permission names apply but are granted with admin consent and are suffixed with `.All` (e.g., `Mail.Read` becomes `Mail.ReadWrite.All` for application-level access to all mailboxes).

## Features

### Email Management

The API supports accessing data in users' primary mailboxes and in shared mailboxes. You can read, create, update, delete, send, reply to, and forward email messages. Messages can be organized into mail folders (Inbox, Drafts, Sent Items, etc.) and custom folders. Apps can set up Inbox rules to promptly handle incoming messages and reduce email clutter. Apps can get the body of an Outlook message in MIME format, send messages in MIME format, and attach S/MIME digital signatures.

- Messages support categories, flags, importance levels, and conversation threading.
- File, item, and reference attachments can be added to messages.
- The API does not support accessing in-place archive mailboxes.

### Calendar and Events

The Calendar API provides calendar, calendarGroup, event, and other resources that enable you to create events and meetings, find workable meeting times, manage attendees, and more.

- Apps can create, manage, and respond to events. Customers can create individual calendars for work, family, and other purposes, and organize them in calendar groups.
- Events support recurrence, attendees, locations (including room resources), online meeting links, reminders, and attachments.
- Customers can share calendars with one another and give permissions to read, write, or delete calendar contents. They can delegate a calendar to let another user respond to meeting requests on their behalf.
- Most features apply to calendars in personal Microsoft accounts and work or school accounts.
- You cannot programmatically initiate a share or delegate action, only work with existing shared/delegated calendars.

### Contacts

You can use typical CRUD operations for an Outlook contact to create and manage contacts. Contacts can be organized into contact folders, categorized, and flagged for follow-up. The contact entity supports a contact photo.

- The contacts API lets you get contact items of the signed-in user, or of the users who have shared or delegated their contacts to the signed-in user.

### Tasks (Microsoft To Do)

The Microsoft To Do API provides a simple way for people to manage their tasks and plan their day. Tasks are organized in task lists, which can be accessed across To Do clients, Outlook, and Teams.

- Tasks support due dates, reminders, recurrence, checklist items (subtasks), file attachments, categories, and linked resources.
- The legacy Outlook tasks API is deprecated. Use the To Do API instead.

### Focused Inbox and Mail Tips

Apps can integrate with Focused Inbox and @-mentions to let users read and respond to what's relevant to them first. Mail tips can be checked while composing a message to get useful status information about a recipient (such as auto-reply status or full mailbox).

### Send on Behalf / Send As

Exchange Online provides mailbox permissions that allow a user to send mail that appears to be sent from another user, distribution list, group, resource, or shared mailbox. Microsoft Graph supports this feature as well.

- Requires `Mail.Send.Shared` delegated permission or `Mail.Send` application permission.

## Events

Microsoft Outlook supports webhook-based change notifications via the Microsoft Graph subscriptions API.

The Microsoft Graph API lets you subscribe to changes to a resource—including creation, update, or deletion of the resource—and receive notifications via webhooks. A subscription specifies the desired types of changes to monitor for a specific resource.

### Message Changes

Subscribe to notifications when messages are created, updated, or deleted in a user's mailbox or specific folder (e.g., Inbox).

- **Resource examples**: `users/{id}/messages`, `users/{id}/mailFolders('Inbox')/messages`
- **Change types**: `created`, `updated`, `deleted`
- You can optionally specify in the subscription request to encrypt and include as part of a notification the resource data that has changed.

### Calendar Event Changes

Subscribe to notifications when calendar events are created, updated, or deleted.

- **Resource examples**: `users/{id}/events`, `users/{id}/calendars/{id}/events`
- **Change types**: `created`, `updated`, `deleted`

### Contact Changes

You can subscribe to changes in Outlook contact, event, or message resources.

- **Resource examples**: `users/{id}/contacts`
- **Change types**: `created`, `updated`, `deleted`

### General Considerations

- There is a maximum limit of 1000 active subscriptions for Outlook resources per mailbox for all applications.
- Subscriptions have a maximum expiration time and must be renewed before they expire.
- The Microsoft Graph REST API can deliver change notifications to clients through various endpoints, including webhooks, Event Hubs, and Event Grid.
- Outlook change notifications support delegated and application permission scopes. Delegated permission supports subscribing to items in folders in only the signed-in user's mailbox.
