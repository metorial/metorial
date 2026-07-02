# Slates Specification for Google Slides

## Overview

Google Slides is a cloud-based presentation application that is part of Google Workspace. The Google Slides API lets you create and modify Google Slides presentations. You can use it to create new slide decks, insert text or images, duplicate slides, update charts, and more.

## Authentication

Google Slides API supports two authentication methods:

### OAuth 2.0

OAuth 2.0: Whenever your application requests private user data, it must send an OAuth 2.0 token along with the request. Your application must use OAuth 2.0 to authorize requests. No other authorization protocols are supported.

- **Authorization endpoint:** `https://accounts.google.com/o/oauth2/v2/auth`
- **Token endpoint:** `https://oauth2.googleapis.com/token`
- When you create your application, you register it using the Google API Console. Google then provides information you'll need later, such as a client ID and a client secret.

**Available scopes:**

| Scope                                                    | Description                                                                           | Sensitivity                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------- |
| `https://www.googleapis.com/auth/presentations`          | See, edit, create, and delete all Google Slides presentations.                        | Sensitive                   |
| `https://www.googleapis.com/auth/presentations.readonly` | See all Google Slides presentations.                                                  | Sensitive                   |
| `https://www.googleapis.com/auth/drive.file`             | See, edit, create, and delete only the specific Google Drive files used with the app. | Non-sensitive (Recommended) |
| `https://www.googleapis.com/auth/drive`                  | See, edit, create, and delete all Google Drive files.                                 | Restricted                  |
| `https://www.googleapis.com/auth/drive.readonly`         | See and download all Google Drive files.                                              | Restricted                  |
| `https://www.googleapis.com/auth/spreadsheets.readonly`  | See all Google Sheets spreadsheets.                                                   | Sensitive                   |
| `https://www.googleapis.com/auth/spreadsheets`           | See, edit, create, and delete all Google Sheets spreadsheets.                         | Sensitive                   |

Use the Drive scopes if you also plan to use the Drive API to manage the sharing settings or parent folders of presentations. The Sheets scopes are only required when creating or refreshing charts linked to Google Sheets.

### Service Accounts

Use a service account for server-to-server communication. Service accounts use a JSON key file downloaded from the Google Cloud Console and authenticate via JWT without user interaction. The key difference between the usage of a service account or OAuth 2.0 is the Google account making the API requests. Using OAuth 2.0 the account you authorize as will be the account that makes the API requests. This means that any presentations or spreadsheets you create will show up in your own Google drive. If you leverage a service account the presentation or spreadsheet will be created by the service account.

### API Keys

There are two ways to identify your application: using an OAuth 2.0 token and/or using the application's API key. If the request requires authorization (such as a request for an individual's private data), then the application must provide an OAuth 2.0 token with the request. The application may also provide the API key, but it doesn't have to. If the request doesn't require authorization (such as a request for public data), then the application must provide either the API key or an OAuth 2.0 token, or both.

## Features

### Presentation Management

Create new presentations and retrieve the full structure of existing presentations, including all slides, layouts, masters, and their page elements. A presentation in the Slides API is made up of pages, which contain page elements. The presentationId corresponds to the ID of the Drive File resource.

### Slide Creation and Manipulation

Create new slides within a presentation, specifying a predefined layout (e.g., TITLE_AND_BODY, BLANK) and insertion index. Slides can be duplicated, reordered, or deleted. You can choose from predefined layouts or reference custom layouts from the presentation's master slides.

### Text Management

Insert, delete, and replace text within text boxes and shapes. Supports bulk text replacement across an entire presentation using placeholder patterns (e.g., `{{placeholder}}`), which is useful for template-based generation. Text styling options include font, size, color, bold, italic, underline, links, and paragraph formatting such as bullets and alignment.

### Shapes and Page Elements

Add and modify shapes, text boxes, lines, and other geometric elements on slides. Page elements are the visual components that are placed on pages. Each element can be positioned and sized using affine transforms (scale, translate, rotate, skew).

### Image Insertion

Insert images into slides from a URL. Images can be placed at specific positions and sizes. The API also supports replacing all shapes matching a text pattern with an image, enabling template-driven image insertion.

### Charts from Google Sheets

Embed charts from Google Sheets into slides. The Sheets scopes are only required when creating or refreshing charts linked to Google Sheets, and the readonly scope is preferred in that case. Linked charts can be refreshed to reflect updated spreadsheet data.

### Template-Based Presentation Generation

Use existing presentations as templates by replacing placeholder text and shapes with real data. This enables automated report and deck generation by combining `replaceAllText` and `replaceAllShapesWithImage` operations. Business data on inventory items like retail merchandise, homes/property, hotels/lodging, restaurants/menus, venues/events, and other "cataloged" assets can be instantly turned into presentations based on pre-existing slide templates.

### Speaker Notes

Read and modify speaker notes associated with individual slides.

### Batch Updates

The batchUpdate method lets you update many aspects of a presentation. Changes are grouped together in a batch so that if one request fails, none of the other (potentially dependent) changes are written. This is the primary mechanism for making modifications — multiple operations (create slides, insert text, add images, etc.) are combined into a single API call.

## Events

While the Google Slides API itself doesn't offer webhooks, you may be able to achieve similar functionality by combining it with other Google Workspace APIs.

The Google Slides API does not support webhooks or event subscriptions. To detect changes to presentation files, you can use the **Google Drive API's push notifications** (watch/channels), which notify when a Drive file (including a Slides presentation) is modified. This is a Drive API feature, not a Slides API feature.
