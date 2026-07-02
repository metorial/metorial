# Slates Specification for Google Forms

## Overview

Google Forms is a Google Workspace application for creating and distributing forms, surveys, and quizzes. The Google Forms API is a RESTful interface that lets you create and modify forms and quizzes, retrieve form responses and quiz grades, set up quiz answer keys with automatic feedback, and receive push notifications.

## Authentication

Google Forms API uses **OAuth 2.0** for authentication. A Google Cloud project with the Google Forms API enabled is required.

**OAuth 2.0 Setup:**

1. Create a Google Cloud project and enable the Google Forms API.
2. Configure the OAuth consent screen (internal or external user type).
3. Create OAuth 2.0 client ID credentials in the Google Cloud Console, choosing the appropriate application type (web, desktop, etc.).
4. Use the client ID and client secret to implement the standard OAuth 2.0 authorization code flow.

**Authorization endpoints:**

- Authorization URL: `https://accounts.google.com/o/oauth2/v2/auth`
- Token URL: `https://oauth2.googleapis.com/token`

**Service Accounts:** Service accounts can be used for server-to-server integrations. With Google Workspace, service accounts can use domain-wide delegation to act on behalf of users.

**Available OAuth Scopes:**

| Scope                                                      | Description                                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `https://www.googleapis.com/auth/forms.body`               | See, edit, create, and delete all your Google Forms forms.                                                  |
| `https://www.googleapis.com/auth/forms.body.readonly`      | See all your Google Forms forms.                                                                            |
| `https://www.googleapis.com/auth/forms.responses.readonly` | See all responses to your Google Forms forms.                                                               |
| `https://www.googleapis.com/auth/drive`                    | See, edit, create, and delete all of your Google Drive files. (broader scope that also grants Forms access) |
| `https://www.googleapis.com/auth/drive.file`               | See, edit, create, and delete only the specific Google Drive files you use with this app.                   |
| `https://www.googleapis.com/auth/drive.readonly`           | See and download all your Google Drive files. (read-only alternative)                                       |

Use the most narrowly scoped option that satisfies your needs. The `forms.body` and `forms.responses.readonly` scopes are preferred over the broader Drive scopes.

## Features

### Form Creation and Management

Create new forms and quizzes programmatically, retrieve form content and metadata, and update existing forms. You can set form settings such as `isQuiz` and `allowResponseEdits`. Updates are performed via batch update requests that can add, modify, move, or delete form items (questions, sections, images, videos, etc.).

- Supports various question types: short answer, paragraph, multiple choice, checkboxes, dropdowns, linear scales, date, time, and question groups such as grid questions.
- Images can be added to questions and form headers.
- Forms created with the API after March 31, 2026 will have an unpublished state by default, requiring explicit publishing.

### Quiz Configuration

Configure forms as quizzes with answer keys, point values, and automatic feedback. Quizzes can include grading, answer keys, and feedback.

### Response Retrieval

Retrieve individual form responses or list all responses for a given form. For responses, users can retrieve a single response or list all responses for a given form. Responses can be filtered by timestamp to fetch only new submissions since the last check.

- Responses are read-only through the API; you cannot create or modify responses.

### Watch Management

The API also manages watches, enabling the creation, deletion, listing, and renewal of watches associated with forms. Watches are used to subscribe to push notifications (see Events section).

- Watches expire after seven days but can be renewed.
- Each form is limited to 50 watches per event type in total across all Cloud Console projects.

## Events

The Google Forms API supports push notifications via a **watch** mechanism that delivers events to **Google Cloud Pub/Sub** topics.

To receive push notifications, you need to set up a Cloud Pub/Sub topic and provide that topic's name when you create a watch for the appropriate event type.

Notifications do not contain detailed form or response data. After each notification is received, a separate API call is required to fetch fresh data.

### Schema Changes (EventType.SCHEMA)

Notifies about edits to a form's content and settings. This includes changes to questions, form title, description, settings, and other structural modifications.

- Requires a watch created with `eventType: SCHEMA` on a specific form.
- The notification payload includes the form ID and event type.

### Response Submissions (EventType.RESPONSES)

Notifies when form responses (both new and updated) are submitted.

- Requires a watch created with `eventType: RESPONSES` on a specific form.
- The notification payload includes the form ID and event type; response data must be fetched separately.
- Your Cloud Pub/Sub topic only receives notifications about forms that you can view with the credentials you supply. If the user revokes permission from your application or loses edit access to a watched form, notifications are no longer delivered.
