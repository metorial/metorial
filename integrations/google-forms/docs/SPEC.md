# Slates Specification for Google Forms

## Overview

Google Forms is a Google Workspace application for creating and distributing forms, surveys, and quizzes. The Google Forms API is a RESTful interface that lets you create, publish, and modify forms and quizzes, retrieve form responses and quiz grades, set up quiz answer keys with automatic feedback, and receive push notifications.

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
| `https://www.googleapis.com/auth/drive.file`               | See, edit, create, and delete only the specific Google Drive files you use with this app.                   |

Use the most narrowly scoped option that satisfies your needs. The restricted broad Drive scopes (`drive`, `drive.readonly`) are not requested by this integration; all Forms operations run on the Forms scopes. Connections that granted broad Drive scopes previously keep working.

## Features

### Form Creation and Management

Create new forms and quizzes programmatically, retrieve form content and metadata, and update existing forms. You can set form settings such as `isQuiz` and `allowResponseEdits`. Updates are performed via batch update requests that can add, modify, move, or delete form items (questions, sections, images, videos, etc.).

- Supports various question types: short answer, paragraph, multiple choice, checkboxes, dropdowns, linear scales, date, time, and question groups such as grid questions.
- Images can be added to questions and form headers.
- Forms created with the API after June 30, 2026 have an unpublished state by default, requiring explicit publishing before they can receive responses.

### Publishing and Response Acceptance

Use **Set Publish Settings** to apply a form's complete `publishState` through `forms.setPublishSettings`. Both `isPublished` and `isAcceptingResponses` are required. Supported combinations are:

- `true` / `true`: publish the form and accept responses.
- `true` / `false`: keep the form published but stop accepting responses.
- `false` / `false`: unpublish the form; unpublished forms cannot accept responses.

The integration sends the narrow `publishState` update mask. The API also accepts `*`, but replacing unrelated future publish settings is unnecessary. Legacy forms without a `publishSettings` field do not support this method.

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


### Implemented New Response Trigger

Only `new_response` is offered. Form schema changes and response edits are intentionally excluded. The forms to watch are an explicit selection, `formIds`: 1 to 100 form IDs supplied when the event is enabled. A form's ID is the part of its edit URL between `/d/` and `/edit` (`https://docs.google.com/forms/d/<form ID>/edit`); the ID in the link shared with respondents is a different one and cannot be used. Forms are not discovered automatically: the Forms API has no method that lists forms, and listing them through Drive returns, with `drive.file`, only the files the app created or the user opened with it, while the Drive scopes that list every form (`drive`, `drive.readonly`) are restricted and not requested. Each selected form is read with `forms.get`, 20 per listing page. A selected ID that is not shaped like a form ID, that Google answers with 400, 403 or 404, or that resolves to a different form is skipped with a warning and the other selected forms are still offered; any other failure, such as a rate limit or server error, fails the listing so that it is retried. Enabling, renewing and reading responses all refuse a form that is no longer selected.

The event needs three kinds of consent, one per call it makes: the account's identity (`userinfo.profile` or `userinfo.email`), read access to the form for `forms.get` (`forms.body.readonly`, `forms.body`, `drive.file`, `drive` or `drive.readonly`), and read access to responses for `forms.responses.list` and for holding a RESPONSES watch (`forms.responses.readonly`, `drive.file` or `drive`). Every one of those form and response scopes is accepted by `forms.watches.create`, `list`, `renew` and `delete`. No Drive scope is required: `forms.body.readonly` with `forms.responses.readonly` and an identity scope is enough, and the Drive scopes remain accepted where Google accepts them. `forms.responses.readonly` on its own is not enough, because it cannot read a form. The response watch is shared: Google counts watches per Cloud project and form, and `forms.watches.list` returns the watches owned by the project, so every connection that enables the same form on the same delivery topic uses one watch. Enabling a form adopts a RESPONSES watch that already publishes to the configured topic, whatever its ID. Otherwise it creates one whose ID is derived from the topic and the form ID, so connections that enable the form at the same time converge on a single watch; when creation fails, the watches are listed again and the one another connection created is adopted.

Google's documentation disagrees with itself about the limit: the [`forms.watches.create` reference](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.watches/create) states one watch per event type per form for each project, while the [push notification guide](https://developers.google.com/workspace/forms/api/guides/push-notifications#limits) states up to 20 watches per project for a form and event type, and one per end user. Nothing depends on either reading. When Google refuses the watch because the form's slot is taken, the form is enabled without a watch of its own, a warning is recorded, the other watch is left untouched, and the watch is attempted again every hour; until then new responses arrive through the 15-minute check. Only two refusals count as a taken slot: a conflict (409), and a failed precondition (400) while a RESPONSES watch on another topic is listed. Any other creation failure, such as a permission, quota or server error, fails enabling the form so that it is retried.

Authenticated Pub/Sub delivery is set up once per Google OAuth application, in the application's Cloud project: one topic and one push subscription shared by every watched form. Whoever owns the OAuth application creates them by following the guided setup, the service operator for the built-in application and a customer for their own: create the topic, allow `forms-notifications@system.gserviceaccount.com` to publish to it, create a service account for push authentication, and create a push subscription that uses the shown delivery URL as its endpoint and audience. They then save the OAuth client ID, topic name, subscription name, and push service account email. Nothing is created in Google Cloud automatically, and enabling a form fails with a setup error until the delivery setup is saved. Only the topic and subscription identifiers, the delivery audience and the expected push-account identity are kept with a form's watch, and they must be unchanged at renewal; OAuth access tokens are never stored with it. A notification is delivered to every connection watching the form it names. For every notification, Pub/Sub signature, issuer, expiry, audience, verified email and subscription are checked before matching the form ID and the RESPONSES attribute. The watch ID in a notification is not compared, because another connection may have recreated the shared watch under a different ID. Forms notifications carry attributes, not response bodies.

A connection that holds a watch requires a watch-list readback showing a RESPONSES watch on the configured topic in ACTIVE state with a future expiration; a watch it created that fails that check is removed again. Renewal is scheduled one day before expiry and renews the shared watch. A suspended watch is renewed, a missing or expired one is recreated, and one that another connection already recreated is adopted, so the saved watch ID follows the watch actually in use. A refused renewal is accepted only when the list shows that another connection has already renewed the watch. The activation boundary is preserved through renewal, recreation and adoption. Cleanup runs once no other connection watches the form on the topic: it checks account and form access, deletes the RESPONSES watches that publish to the configured topic and lists again. The topic decides what is removed, not the saved watch ID, which can be stale or absent when another connection created the shared watch later. A watch on another topic is never deleted, and an inaccessible 404 never proves removal.

The activation time defines the silent historical baseline: the creation timestamp of a watch the connection created, retaining its nanosecond precision, or the time the form was enabled when it adopts an existing watch or holds none. A response first submitted before activation is excluded even if edited now. A new response edited before first retrieval is included once with current answers. Notifications and the 15-minute check both read `timestamp >= cursor - 1 hour`, never earlier than activation, where the cursor is the latest submission time seen by a completed read and only moves forward. The one-hour overlap catches delayed visibility and dropped notifications. Response IDs are kept with their first submission time only while that window can return them again and are pruned afterwards; a response first submitted before the window was reported by an earlier read, so its later edits are ignored without keeping its ID. Other forms' state is retained.

Work per read is bounded: it stops at the first page boundary after 2,000 new responses, 20 pages of 1,000 responses, or 30 seconds. A larger backlog is not an error. The read returns the events found so far and saves its page position, and the next notification or check continues from there with the same filter. Google does not document the order of `forms.responses.list`, so the cursor moves only after every page of the window has been read; responses that share a timestamp across two reads are neither lost nor repeated. If Google rejects a saved page position, the same window is read again and responses already reported are skipped. Only when that happens more than three times in a row without reaching anything new does the read fail visibly, without advancing state. A failed page never changes saved state. Responses deleted before retrieval cannot be emitted. Answers contain text values and uploaded Drive file references; links do not grant access or download file contents.

Test fixtures follow the official [push notification shape](https://developers.google.com/workspace/forms/api/guides/push-notifications), [watch contract](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.watches), [response resource](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses), and [timestamp filtering](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list). Live lifecycle verification requires a suite-owned delivery topic/subscription fixture in the OAuth project. The Forms API cannot submit responses, so real submitted-answer and event delivery verification requires a live published form and a real respondent action; a watch lifecycle alone does not prove those paths.
