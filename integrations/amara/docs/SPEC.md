# Slates Specification for Amara

## Overview

Amara is a web-based platform for video subtitling, captioning, and translation. It provides tools for creating, editing, and managing subtitles collaboratively, with support for team-based workflows, subtitle review/approval processes, and integration with video hosting platforms like YouTube and Vimeo.

## Authentication

Amara uses API key authentication. To obtain an API key, create a user on the Amara website, then go to the account page. At the bottom of the page you will find a "Generate new key" button. Clicking on it will generate the needed API key.

Every API request must include the API key via the `X-api-key` HTTP header:

```
X-api-key: YOUR_API_KEY
```

All API requests should go through HTTPS. This is important since an HTTP request will send your API key over the wire in plaintext.

There are no OAuth flows or scopes. The API key is tied to the user account and provides access based on that user's permissions within teams and projects.

## Features

### Video Management

Add, list, view, and delete videos on the Amara platform. Videos can be added by providing a URL from supported providers (YouTube, Vimeo) or direct file links (mp4, etc.). Videos can be associated with teams and projects, and metadata such as title, description, thumbnail, and primary audio language can be set. A video can have multiple URLs (e.g., one YouTube URL and one Vimeo URL), with one designated as primary. Deleting a video requires team admin permissions.

### Subtitle Management

Create, fetch, update, and delete subtitles for videos in any supported language. Subtitles can be uploaded and downloaded in multiple formats including DFXP, SRT, VTT, SSA, and SBV. Subtitle languages can be configured with soft limits for characters per line, characters per second, max/min duration, and max lines to guide editors. Each subtitle language maintains a version history with author tracking.

### Subtitle Workflow Actions

Perform workflow actions on subtitles such as save draft, publish, approve, and reject. Available actions depend on the team configuration and the current state of the subtitles. Actions can be performed standalone or combined with subtitle uploads.

### Subtitle Notes

Add and retrieve notes on subtitle sets for communication between collaborators during the editing process.

### Team Management

Create, list, and view teams. Teams support configurable membership policies (open, application-based, invitation-only), video policies, and visibility settings (public, unlisted, private). Teams can be of different types: default, simple (simplified workflow), or collaboration. Team creation is restricted to Amara partners.

### Team Member Management

Add, update, and remove team members with role-based access control. Supported roles include owner, admin, manager, project/language manager, contributor, and limited contributor. Project/language managers can be scoped to specific projects and languages.

### Project Management

Organize team videos into projects with names, descriptions, and guidelines. Projects can optionally have task workflows enabled.

### Team Applications

List, view, approve, or deny membership applications for teams that use application-based membership policies. Applications can be filtered by status, date range, and user.

### Team Language Preferences

Configure preferred languages (which auto-create tasks for new videos) and blacklisted languages (which disallow subtitle creation) at the team level.

### Subtitle Requests

Track and manage subtitle work through structured requests on collaboration teams. Requests support a multi-stage workflow: subtitling → review → approval → complete. Assignees (subtitler, reviewer, approver) can be managed, and due dates can be set for each stage. Multi-team collaboration is supported, where a source team, work team, and up to three evaluation teams can participate in a single request.

### Activity Tracking

View activity logs scoped to a video, team, or user. Activity types include video additions/deletions, subtitle version changes, URL changes, team membership changes, and subtitle request state changes. Activity can be filtered by type, user, language, and date range.

### User Management

Create new users, view user profiles, and update account details. User creation supports options like auto-login tokens and automatic username deduplication. Users can be referenced by username or user ID.

### Messaging

Send messages to individual users or entire teams through the API.

### Supported Languages

Retrieve the full list of languages supported by the Amara platform, using BCP-47 language codes.

## Events

Amara supports HTTP callbacks (webhooks) for enterprise team accounts. A callback URL is registered per team by contacting Amara (it cannot be self-configured via the API). Notifications are sent as HTTP POST requests with JSON-encoded data.

### Video Events

Notifications related to videos within a team:

- **video-added**: Fired when a video is added to the team or moved from another team.
- **video-removed**: Fired when a video is removed from the team or moved to another team.
- **video-made-primary**: Fired when a video's primary URL is changed.
- **video-moved-project**: Fired when a video is moved to a different project within the team.
- **subtitles-published**: Fired when a new subtitle version is published for a team video. Includes the language code and version number.
- **subtitle-unpublished**: Fired when subtitles are deleted for a team video.

### Team Member Events

Notifications related to team membership changes:

- **member-added**: Fired when a user is added to the team.
- **member-removed**: Fired when a user is removed from the team.
- **member-profile-changed**: Fired when a team member's profile information is updated.

Each notification includes an incrementing `number` field that can be used to track notification ordering and detect missed notifications. Notification history can be retrieved and inspected via the team notifications API endpoint.
