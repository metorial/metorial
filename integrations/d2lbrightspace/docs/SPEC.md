# Slates Specification for D2L Brightspace

## Overview

D2L Brightspace is a Learning Management System (LMS) used across K–12, higher education, and corporate training to deliver coursework, manage assignments, track grades, and support digital learning. Brightspace is a Learning Management System (LMS) used across K–12, higher education, and corporate training to deliver coursework, manage assignments, track progress, and support digital learning. It's built by D2L (Desire2Learn), a long-time education technology company focused on personalized, data-driven learning experiences. The platform provides a comprehensive REST API (historically known as the "Valence" API) for programmatic access to its features.

## Authentication

The Brightspace API provides developers with two authentication approaches: OAuth 2.0 and their own proprietary ID Key Auth. However, the legacy ID-Key authentication workflow has been deprecated as of Brightspace 20.23.1 (January 2023), and D2L encourages clients to move to using OAuth 2.0.

### OAuth 2.0 (Recommended)

Brightspace supports the **Authorization Code Grant** flow for user-context API access and the **Client Credentials Grant** (with Private Key JWT) for server-to-server authentication.

**Authorization Code Grant:**

1. Register your application via the Brightspace Admin Tools under "Manage Extensibility" → "OAuth 2.0" → "Register an app", providing an application name.
2. Provide a Redirect URI and specify scopes. Scopes take the form of a space-delimited string: `group:resource:permissions` (e.g., `content:toc:read enrollment:orgunit:read core:*:*`).
3. Use the Authorization Code Grant workflow with these endpoints:
   - **Authorization endpoint:** `https://auth.brightspace.com/oauth2/auth`
   - **Token endpoint:** `https://auth.brightspace.com/core/connect/token`
4. Send your retrieved access token as a Bearer token in the HTTP `Authorization` header of each API call.
5. API calls are made against the institution's Brightspace instance host (e.g., `https://myschool.brightspace.com`), which must be provided as a custom input.

**Client Credentials Grant (Server-to-Server):**

Brightspace supports server-to-server API authentication using the OAuth 2.0 Client Credentials grant with Client Assertion (Private Key JWT). This allows trusted integrations to call APIs without user interaction.

**Required inputs:**

- **Brightspace Instance URL** (e.g., `https://myschool.brightspace.com`) — the host for all API calls
- **Client ID** and **Client Secret** — obtained from the Manage Extensibility tool after app registration
- **Scopes** — defined during app registration, following the `group:resource:permissions` pattern

### Legacy ID Key Auth (Deprecated)

Uses an Instance URL, Application Key, and Application ID, which are received when an application is registered in Brightspace using the "Manage Extensibility" tool. Not recommended for new development.

## Features

### User Management

Create, read, update, and delete user accounts. Manage user roles, profiles, demographics, and account settings. Look up user information and manage user accommodations.

### Organization Structure

Manage organizational units including departments, semesters, and other org unit types. Configure the hierarchical structure of the learning environment.

### Course Management

Create and manage course offerings and course templates. Handle course content including modules and topics, manage course files, and configure course-level settings.

### Enrollments

The Brightspace API allows apps to read, create, or modify a variety of resources in the user's Brightspace environment. Enroll and unenroll users in courses and other org units, manage auditor roles, and query enrollment status across the organization.

### Grades and Assessments

The Brightspace API can let your app send and update scores in the user's gradebook. Manage grade items, grade categories, and individual student grades. Work with rubrics and assessments. Supports reading and writing grade data.

### Assignments (Dropboxes)

Create and manage assignment dropbox folders. Submit and retrieve student submissions. Manage feedback on submissions.

### Quizzes and Surveys

Create and manage quizzes and surveys within courses. Configure quiz settings, questions, and manage quiz attempts and results.

### Discussions

Manage discussion forums, topics, and threads within courses. Create, read, update, and delete discussion content.

### Course Content

Apps can generate resources that appear in Brightspace. Content integration lets your app communicate with Brightspace. For example, a teacher can assign a lesson from an external app, which then sends information to Brightspace to generate and post it. Manage modules, topics, and content structure.

### Calendar and Events

Create and manage calendar events associated with courses and org units.

### News / Announcements

Create and manage news items (announcements) within courses or organization units.

### Awards

Manage awards (badges, certificates) including creating award definitions, associating awards with org units, and issuing awards to users.

### Groups and Sections

Create and manage groups and sections within courses for collaborative work and organizational purposes.

### Learning Outcomes and Competencies

Define and manage learning outcomes and competency structures. Associate outcomes with courses and activities.

### ePortfolio

Manage ePortfolio objects including artifacts, reflections, collections, presentations, learning objectives, and sharing. Supports data export and import of portfolio content.

### Release Conditions and Checklists

Configure release conditions to control content availability. Manage course checklists for student progress tracking.

### Data Hub and Data Export

Access bulk data exports through the Data Hub framework. Download full or differential data sets for reporting and analytics purposes.

### LTI Integration

Manage LTI (Learning Tools Interoperability) tool configurations, including both LTI Advantage and legacy LTI assets, for embedding external tools within the LMS.

### SIS Integration (IPSIS)

Configure and manage Student Information System integration through the IPSIS framework.

### Lockers

Manage personal and group file storage lockers for users.

### Notifications

Manage notification preferences and settings for users.

### Permissions and Configuration

Manage role-based permissions and system configuration variables across the platform.

## Events

Brightspace supports real-time event streaming through **Brightspace Data Streams (BDS)**, a webhook-based system that delivers user activity events.

BDS produces a stream of event objects describing user interactions and other events associated with a particular organization. BDS provides a relatively "raw" data stream so that organizations can analyze and mine the information. Events are posted with minimal latency, providing a close-to-real-time record.

A webhook endpoint needs to be set up to receive automated HTTP POST requests containing Brightspace Data Streams' data payloads. Events are formatted as xAPI-compliant objects.

### Award Events

Events related to managing awards, associating awards with org units, and issuing awards to users.

### Announcement Events

Events for creating/updating/deleting announcements and viewing the announcement homepage.

### Calendar Events

Events for viewing the calendar homepage, viewing individual calendar events, and creating/updating/deleting calendar events.

### Course Content Events

Events for viewing content homepages, modules, and topics. Also covers content creation/modification/deletion, content service activities, and content completion tracking.

### Discussion Events

Events for viewing the discussions homepage, forums, topics, and threads. Also covers creation and management of discussion forums, threads, and topics.

### Assignments and Grades Events

Events for viewing assignments and grades homepages, managing assignments, managing grades, and managing activity exemptions.

### Quiz Events

Events for submitting, grading, and managing quiz attempts.

### Organization Structure Events

Events for viewing org unit homepages, daily course access, managing org units, viewing groups management pages, and enrolling users in org units.

### External Tool Events

Events for LTI tool launches from within Brightspace.

### User Session Events

Events for user login, logout, session timeout, and user impersonation (start and end).
