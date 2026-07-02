# Slates Specification for Google Classroom

## Overview

Google Classroom is a learning management system (LMS) by Google, part of Google Workspace for Education. It manages classes, rosters, and invitations in Google Classroom. Applications can programmatically view, create, and modify Classroom work, add materials to work, turn in work for students, and send grades back to Classroom.

## Authentication

Google Classroom uses **OAuth 2.0** for authentication. The Classroom API uses OAuth to authorize permission.

**Setup Requirements:**

- A Google Cloud project with the Classroom API enabled.
- An OAuth 2.0 Client ID, which is used to identify a single app to Google's OAuth servers.
- A configured OAuth consent screen.
- A Client ID and Client Secret.

**OAuth 2.0 Flow:**

1. Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth` with parameters including `client_id`, `redirect_uri`, `response_type=code`, desired scopes, and `access_type=offline` for refresh tokens.
2. Google redirects to your redirect URI with an authorization code.
3. Exchange the authorization code for tokens via `POST https://oauth2.googleapis.com/token` with `code`, `client_id`, `client_secret`, `redirect_uri`, and `grant_type=authorization_code`.
4. Refresh tokens via `POST https://oauth2.googleapis.com/token` with `client_id`, `client_secret`, `refresh_token`, and `grant_type=refresh_token`.

**Available Scopes:**

| Scope                                             | Description                                                    |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `classroom.courses`                               | Create, edit, and delete classes                               |
| `classroom.courses.readonly`                      | View classes                                                   |
| `classroom.rosters`                               | Manage class rosters                                           |
| `classroom.rosters.readonly`                      | View class rosters                                             |
| `classroom.coursework.me`                         | Manage own coursework and grades                               |
| `classroom.coursework.me.readonly`                | View own coursework and grades                                 |
| `classroom.coursework.students`                   | Manage coursework and grades for students in classes you teach |
| `classroom.coursework.students.readonly`          | View coursework and grades for students in classes you teach   |
| `classroom.courseworkmaterials`                   | Manage classwork materials                                     |
| `classroom.courseworkmaterials.readonly`          | View classwork materials                                       |
| `classroom.announcements`                         | Manage announcements                                           |
| `classroom.announcements.readonly`                | View announcements                                             |
| `classroom.topics`                                | Manage topics                                                  |
| `classroom.topics.readonly`                       | View topics                                                    |
| `classroom.guardianlinks.students`                | Manage guardians for students                                  |
| `classroom.guardianlinks.students.readonly`       | View guardians for students                                    |
| `classroom.guardianlinks.me.readonly`             | View own guardians                                             |
| `classroom.profile.emails`                        | View email addresses of people in classes                      |
| `classroom.profile.photos`                        | View profile photos of people in classes                       |
| `classroom.push-notifications`                    | Receive notifications about Classroom data changes             |
| `classroom.addons.teacher`                        | Manage add-on attachments as a teacher                         |
| `classroom.addons.student`                        | View/update add-on attachments as a student                    |
| `classroom.student-submissions.me.readonly`       | View own submissions and grades                                |
| `classroom.student-submissions.students.readonly` | View student submissions in classes you teach                  |

All scopes use the prefix `https://www.googleapis.com/auth/`. Depending on the scopes selected, you may need to go through an approval process with Google, which can take several weeks.

**Note:** The specific tasks the API can perform depend on the user's role in a class — a user can be a student, teacher, or administrator.

## Features

### Course Management

All course data can be created, changed, updated, or removed via the API, including creating new courses and managing course metadata such as name, section, description, and course state. Courses can be assigned aliases for mapping external identifiers to Classroom course IDs. Students and teachers are specific mappings between a user profile and a course — a user can be a teacher in one course and a student in another.

### Roster Management

The API allows retrieving roster information for a specific class, including its list of educators and students, along with user profiles containing name, email address, and profile picture. You can add or remove teachers and students from courses programmatically. Course invitations can be created and managed to invite users to join a course in a specific role.

### Coursework and Assignments

Assignments, quizzes, and homework can be retrieved, created, updated, or deleted. The API can create and update submissions, set maximum point values for assignments, and assign grade values to student submissions. All stream items can contain supplementary materials, such as Google Drive files, YouTube videos, Google Forms, URL hyperlinks, and Classroom add-on attachments. All stream items can be assigned to a subset of the students in the course.

### Announcements

Teachers create announcements at the top of the Stream page in the Classroom UI, and the API supports Announcement, CourseWork, and CourseWorkMaterial stream item types. Announcements can be created, viewed, updated, and managed programmatically, including posting to individual students.

### Topics

Topics allow organizing coursework and materials within a course. They can be created, viewed, edited, and listed through the API.

### Rubrics

Developers can manage assignment rubrics via the API — specifically, they can read and write rubrics, and see student submission scores broken down by rubric criteria rather than just accessing the total score.

### Guardian Management

The API can be used to manage and invite guardians, which are a mapping between a student and guardian. Guardians in Classroom have access to some student information, like their assignments.

### User Profiles

UserProfiles represent a mapping to a user's domain profile as identified by unique ID or email address. The current user may also refer to their own ID using the "me" shorthand. Profile information includes emails and photos (with appropriate scopes).

### Classroom Add-ons

Developers can build add-on integrations that attach content to stream items (assignments, materials). Add-ons support teacher and student views, grading, and content-type or activity-type attachments embedded within Classroom's UI.

### Grading Periods

The API supports reading and managing grading period configurations for courses and associating coursework with specific grading periods.

## Events

The Classroom API push notifications feature allows applications to subscribe for notifications when data changes in Classroom. Notifications are delivered to a Cloud Pub/Sub topic, usually within a few minutes of the change.

To use push notifications, you must:

1. Set up a Google Cloud Pub/Sub topic.
2. Grant `classroom-notifications@system.gserviceaccount.com` the `projects.topics.publish` permission on your topic.
3. Create a registration via the Classroom API specifying the feed type and the Pub/Sub topic.
4. The `classroom.push-notifications` scope is required, along with relevant data scopes.

Registrations last for one week but can be extended by making an identical request.

**Limitations:** Domain-wide delegation of authority is not currently supported for push notifications. Notifications may not be sent for changes in courses where the course owner is not part of a Google Workspace for Education domain.

### Roster Changes (Domain-wide)

Each domain has a roster changes feed which exposes notifications when students and teachers join and leave courses in that domain. Requires the rosters scope.

### Roster Changes (Per Course)

Each course has a roster changes feed which exposes notifications when students and teachers join and leave that specific course. Requires the rosters scope. A specific `courseId` must be provided when registering.

### Course Work Changes (Per Course)

Each course has a course work changes feed which exposes notifications when any course work or student submission objects are created or modified in that course. Requires the coursework students scope. A specific `courseId` must be provided when registering.
