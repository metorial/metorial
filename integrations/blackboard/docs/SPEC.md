Let me check the API reference page for a full list of features, and also look for webhook support specifically.Now I have a comprehensive understanding. Let me confirm whether Blackboard has webhook support or not.

Based on my research, Blackboard Learn REST API does not appear to have native webhook or event subscription support. The API is purely request-response based. Let me compile the specification.

# Slates Specification for Blackboard

## Overview

Blackboard Learn (now part of Anthology) is a learning management system (LMS) used by educational institutions to deliver courses, manage enrollments, track grades, and facilitate communication between instructors and students. It provides a REST API that allows external applications to programmatically access and manage LMS data such as courses, users, content, grades, and more.

## Authentication

Blackboard Learn supports OAuth 2.0 for API authentication with two grant types:

### 1. Client Credentials (Two-Legged OAuth)

Authentication for REST integrations follows the OAuth 2.0 RFC Standard. Each developer has a unique key and secret associated with each application they create, and makes an HTTP POST directly to the REST-enabled Learn server requesting an OAuth access token.

**Setup:**

- Register as a developer at `developer.blackboard.com` and create an application to receive an Application ID, Key, and Secret.
- Before you can use an integration with Blackboard Learn, an administrator must register it with Blackboard Learn. Before you begin, you must obtain an application ID. The admin registers the Application ID on the Learn instance and assigns a Learn User whose permissions the integration will inherit.

**Token Request:**

- POST to `/learn/api/public/v1/oauth2/token` with `grant_type=client_credentials`
- Authorization set to Basic followed by a space and base64-encoded credentials. Credentials must be formatted as `application-key:secret` before encoding.
- The Portal returns an authorization token that grants the application access to the Learn REST API for one hour.
- Use the returned `access_token` as a Bearer token in subsequent requests.

**Considerations:**

- One of the drawbacks associated with Basic Authentication is that the application requires broad access, as the tool is acting as a system-level user.
- The Learn instance base URL (e.g., `https://yourschool.blackboard.com`) is required as each institution has its own server.

### 2. Authorization Code (Three-Legged OAuth / 3LO)

Three-legged OAuth (3LO) allows an application to act as a user, enabling much more granular access control. Rather than a system user acting as someone that can modify all courses, the application acts as a specific user with only their permissions.

**Flow:**

1. Redirect the user to: `GET /learn/api/public/v1/oauth2/authorizationcode` with `redirect_uri`, `response_type=code`, `client_id`, `scope`, and optionally `state`.
2. The user logs in and authorizes the application.
3. Exchange the authorization code for a token: POST to `/learn/api/public/v1/oauth2/token` with `grant_type=authorization_code`, the `code`, and `redirect_uri`.

**Scopes:**

- `read`, `write`, or `offline` are available scopes.
- The `offline` scope allows an application to access Blackboard Learn as a user without requiring the user to login each time. When granted, a `refresh_token` is returned.

**PKCE Support:**

- Starting in version 3700.4, Blackboard Learn's 3-Legged OAuth 2.0 implementation supports the Proof Key for Code Exchange (PKCE) extension.

## Features

### Course Management

Create, read, update, and delete courses. Manage course properties including availability, enrollment settings, terms, and descriptions. Supports organizing courses into categories.

### User Management

Create, read, update, and delete user accounts. Manage user profiles including names, contact information, system roles, and availability. Users can be identified by internal ID, UUID, username, or external ID.

### Enrollment / Course Memberships

Manage course memberships including enrolling and unenrolling users in courses, assigning course roles (student, instructor, etc.), and controlling availability. Also supports organization memberships.

### Course Content

Create documents in Learn, pull lists of different types of content in a course, and manage content items. Supports folders, files, links, and other content types. Content can be organized hierarchically with parent-child relationships and configured with adaptive release dates and availability settings.

- File attachments can be uploaded and associated with content items.

### Assignments and Assessments

Blackboard Ultra offers a REST API for managing assignments. Create assignments with instructions, file attachments, due dates, and grading settings. Manage student assignment attempts and submissions.

### Gradebook

Manage grade columns (creating, updating, configuring scoring), record and retrieve student grades, and sync grades between external tools and the Blackboard gradebook. The Gradebook Columns API provides flexibility in grading, including changing formulas used in grade calculations for the "Overall Grade" column.

- Supports grade schemas and calculated columns.

### Announcements

Manage announcements at the system and course level, including creating, reading, and deleting them.

### Calendar

Non-3LO users can manage calendars, and integrate external calendar systems with Learn Calendars, including Personal, Course/Organization, and System calendars.

### Attendance

Track whether a student arrived at a class, was late, or absent. Integrate with attendance systems and tie attendance data to grades in the grade center. Create and manage attendance meetings and record student attendance statuses.

- If you create an attendance meeting using the REST API, the attendance status can only be modified using the REST API, not the GUI.

### Course Groups

Manage groups within courses, including creating group sets, assigning members, and configuring group properties.

### Course Messages

Send and manage messages within courses for instructor-student communication.

### Data Sources

Manage data source keys used to associate records with external systems, useful for SIS integrations and tracking the origin of data.

### Institutional Hierarchy

Manage institutional hierarchy nodes for organizing the institution's structure.

### System Administration

Manage system-level settings including terms, system roles, institution roles, course roles, LTI placements, and user sessions.

## Events

The provider does not support webhooks or event subscriptions through its REST API. There is no built-in mechanism for receiving real-time notifications about changes in the system. Integrations must poll the API to detect changes.
