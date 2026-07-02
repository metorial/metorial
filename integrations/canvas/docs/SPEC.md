Now let me get the specific list of live events available:I now have comprehensive information. The live events categories are listed in the navigation structure at search result 53-18 and 56-30. Let me compile the specification.

# Slates Specification for Canvas

## Overview

Canvas LMS, by Instructure, is a learning management system used by educational institutions to manage courses, assignments, grading, enrollments, and collaboration. It includes a REST API for accessing and modifying data externally from the main application, in your own programs and scripts. Canvas LMS supports several experiences including Canvas Career and Canvas for Elementary.

## Authentication

Canvas supports two primary authentication methods:

### 1. OAuth2 (Authorization Code Flow)

Canvas uses OAuth2 (specifically RFC-6749) for authentication and authorization of the Canvas API.

If your application will be used by others, you will need to implement the full OAuth2 token request workflow, so that you can request an access token for each user of your application. Performing the OAuth2 token request flow requires an application client ID and client secret. To obtain these application credentials, you will need to register your application.

Developer keys are OAuth2 client ID and secret pairs stored in Canvas that allow third-party applications to request access to Canvas API endpoints via the OAuth2 flow. For Canvas Cloud (hosted by Instructure), developer keys are issued by the admin of the institution.

**Key details:**

- **Authorization endpoint:** `https://<canvas_domain>/login/oauth2/auth`
- **Token endpoint:** `https://<canvas_domain>/login/oauth2/token`
- The `<canvas_domain>` is the institution's specific Canvas domain (e.g., `myschool.instructure.com`). This is a required custom input, as each institution has its own Canvas instance.
- Developer keys issued after Oct 2015 generate tokens with a 1 hour expiration. Applications must use refresh tokens to generate new access tokens.
- Scopes can be specified to control what information the Canvas API access token will provide access to. Canvas API scopes may be found beneath their corresponding endpoints in the "resources" documentation pages. If the developer key does not require scopes and no scope parameter is specified, the access token will have access to all scopes.
- By scoping the tokens, Canvas allows root account administrators to manage the specific API endpoints that tokens issued from a developer key have access to. Developer key scopes allow root account administrators to restrict the tokens issued from developer keys to a subset of Canvas API endpoints.
- Scopes follow the format `url:METHOD|/api/v1/resource/path` (e.g., `url:GET|/api/v1/users/:user_id/courses`).

### 2. Personal Access Tokens

User Access Tokens (generated from within an individual user's settings page) are useful for tinkering, or a single-user run script. They will only provide the equivalent permissions of the owning-user.

Access tokens are passed via the `Authorization: Bearer <token>` header or as a query parameter.

### Important Notes

- All API access is over HTTPS, against your normal Canvas domain.
- Developer keys created in a root account, by root account administrators or Instructure employees, are only functional for the account they are created in and its sub-accounts.

## Features

### Course Management

Create, update, list, and delete courses. Configure course settings such as grading standards, enrollment restrictions, start/end dates, syllabus content, and default views. Supports course templates and Blueprint Courses for content locking across associated courses.

### User Management

List, create, update, and search users within an account. Manage user profiles, avatars, logins, and custom data. Supports merging and splitting user accounts. Users can be looked up by Canvas ID, SIS ID, or login ID.

### Enrollments

Enroll users in courses with specific roles (student, teacher, TA, observer, designer). Manage enrollment states (active, invited, completed, inactive, deleted). Enrollments can be scoped to specific course sections.

### Assignments & Assignment Groups

Create and manage assignments with configurable submission types (online upload, text entry, URL, media recording, external tool, etc.), due dates, point values, grading types, and peer review settings. Organize assignments into weighted groups.

### Submissions & Grading

Submit work on behalf of students or retrieve submissions. Grade submissions, leave comments, and manage rubric assessments. Supports anonymous grading and moderated grading workflows. Access grade change audit logs.

### Quizzes

Create and manage quizzes with various question types. Retrieve quiz submissions and statistics. Canvas supports both classic quizzes and New Quizzes.

### Discussions

Create and manage discussion topics and threaded replies. Supports graded discussions, group discussions, and announcements. Manage discussion entry read/unread states.

### Modules

Create and manage course modules that organize content into sequential learning paths. Add items (assignments, pages, files, URLs, etc.) to modules. Configure prerequisites and completion requirements.

### Pages (Wiki)

Create, update, and manage wiki pages within courses or groups. Supports revision history and page-level editing roles.

### Files & Folders

Upload, download, organize, and manage files and folders within courses, groups, or user personal file spaces. Supports usage rights and content licensing.

### Calendar Events & Scheduling

Create and manage calendar events for courses, groups, and users. Supports recurring events. Manage appointment groups for office hours and scheduling.

### Gradebook

Access computed grades, grading periods, grading standards, and grade passback. Supports custom grade statuses and late policies.

### Groups

Create and manage groups and group categories within courses or accounts. Supports self-sign-up and auto-assignment of group members.

### Conversations (Messaging)

Send and manage messages between users. Supports bulk messaging, forwarding, starring, and archiving.

### Rubrics

Create, manage, and associate rubrics with assignments for structured assessment criteria.

### Outcomes & Outcome Groups

Define learning outcomes and organize them into groups. Align outcomes with assignments and assess student mastery.

### Analytics

Access course-level and account-level analytics including page views, participation data, assignment statistics, and student performance summaries.

### SIS Integration

Import and manage Student Information System (SIS) data via CSV imports. Reference objects by SIS IDs throughout the API. Track import status and errors.

### Account Administration

Manage account-level settings, sub-accounts, roles, permissions, terms, and authentication providers. Generate account-level reports.

### Content Sharing & Migration

Share content between courses and users. Perform content migrations between courses or from external sources (Common Cartridge, QTI, etc.). Supports course copy operations.

### External Tools (LTI)

Configure and manage LTI external tool integrations at the course or account level.

### Collaborations

Manage real-time document collaboration spaces within courses using external tools like Google Docs or Microsoft Office.

## Events

Canvas supports real-time event streaming through its **Live Events / Canvas Data Services** system.

Live Events are specific events emitted by Canvas when an interesting action takes place, such as a page being accessed, a student submitting an assignment, or course settings being updated. Customers can subscribe to specific events and receive them using either an AWS SQS queue or an HTTPS Webhook.

Live Events are well suited for analytics and data collection applications, but should not be used for applications that need their data immediately and as up-to-date as possible.

Events can be delivered in two formats: Canvas or Caliper 1.1. Subscriptions are configured at the account level through the Data Services admin UI or API.

The available event categories include:

### Account Events

Events for account-level changes such as notification creation and account settings updates.

### Asset Events

Events related to user access of assets (page views, resource access tracking).

### Assignment Events

Events emitted when assignments or assignment groups are created, updated, or have their override dates changed.

### Attachment Events

Events for file creation, updates, and deletions within courses.

### Content Events

Events for content migrations and content sharing activities.

### Conversation Events

Events for message creation and forwarding.

### Course Events

Events when courses are created, updated, completed, or have their sections changed. Includes course settings changes.

### Discussion Events

Events for discussion topic and discussion entry creation, updates, and deletions.

### Enrollment Events

Events when users are enrolled, enrollment state changes, or enrollments are updated in courses.

### Grade Events

Events for grade changes on submissions, including final grade calculations.

### Group Events

Events for group creation, updates, membership changes, and group category changes.

### Learning Outcomes Events

Events related to outcome result calculations and rubric assessments.

### Login/Logout Events

Events when users log in or log out of Canvas.

### Module Events

Events for module creation, updates, and module item progression/completion.

### Quiz Events

Events for quiz submissions, question answering, and quiz-related activities (classic quizzes).

### Submission Events

Events when assignments are submitted, updated, or comments are added. Includes plagiarism-related resubmit events.

### SIS Batch Events

Events related to SIS import batch processing.

### Syllabus Events

Events when a course syllabus is updated.

### User Events

Events for user creation, updates, and account-level user changes.

### Wiki Page Events

Events when wiki pages are created, updated, or deleted.
