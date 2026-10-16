# Canvas integration

## Connection

OAuth2 authorization and token exchange use the institution's HTTPS Canvas origin at `/login/oauth2/auth` and `/login/oauth2/token`. Authorization includes the framework-provided state and requested endpoint scopes. Token refresh preserves the Canvas domain and the existing refresh token when no replacement is returned. Expiry comes only from the provider's `expires_in` field.

The instance domain belongs to the authentication method. Tools can fall back to the legacy stored domain configuration for existing connections. No account, course, or other opaque resource identifier is required during connection setup.

Personal tokens are supported for testing the token owner's account. Canvas requires OAuth for applications used by multiple users. [OAuth documentation](https://canvas.instructure.com/doc/api/file.oauth.html).

## Workflows

- Identity: `who_am_i` reads `/users/self/profile`.
- Courses: list and read courses; create, update, conclude, or delete courses. Discover permitted creation accounts using `list_course_creation_accounts`. Course name/code search filters the complete accessible course list locally because `/courses` does not document `search_term`. Deletion and conclusion retain real course metadata read before the operation and expose the actual confirmation response.
- Enrollments: list enrolled users and enrollments; enroll users or conclude, deactivate, or delete an enrollment.
- Assignments: list, read, create, update, and delete assignments; discover assignment groups; list and grade submissions with comments and rubric details available in the original response.
- Course content: list, read, and manage pages and discussions, including announcements and associated graded discussion assignments; list and manage modules and add module items. Inline module-item expansion falls back to the paginated items API when needed.
- Calendar: list events or assignment due dates; create, update, and delete calendar events.
- Messages: list and read conversations without marking them read; send messages with optional uploaded file IDs and bulk/group settings. Sending retains the first-conversation output fields and returns all created conversations.
- Classic quizzes: list quizzes and read complete quiz details. New Quizzes use a different API and are outside this package.
- Files: list course files and download a file by ID, preserving its complete metadata and actual URL. Downloads always use the authenticated same-instance `/files/:file_id/download` endpoint with the real ID from the metadata response. OAuth requires both the metadata and canonical download endpoint scopes. The original provider URL is preserved in metadata; no expiring URL or file-content transformation is needed.
- Analytics: read course activity, assignment statistics, and paginated student summaries, subject to Canvas permissions.

All existing tool keys and schemas are retained. Optional fields expose original provider responses. Lists follow the provider's opaque next-page Link URLs and reject invalid responses, repeated links, and links outside the authenticated API origin. Mutations report validation and upstream failures as structured service errors. No Live Events or triggers are registered.

## Official API references

- [Pagination](https://canvas.instructure.com/doc/api/file.pagination.html)
- [Courses and course users](https://canvas.instructure.com/doc/api/courses.html)
- [Accounts and permitted course creation accounts](https://canvas.instructure.com/doc/api/accounts.html)
- [User profiles](https://canvas.instructure.com/doc/api/users.html)
- [Enrollments](https://canvas.instructure.com/doc/api/enrollments.html)
- [Assignments](https://canvas.instructure.com/doc/api/assignments.html) and [assignment groups](https://canvas.instructure.com/doc/api/assignment_groups.html)
- [Submissions and grading](https://canvas.instructure.com/doc/api/submissions.html)
- [Modules and module items](https://canvas.instructure.com/doc/api/modules.html)
- [Discussion topics](https://canvas.instructure.com/doc/api/discussion_topics.html)
- [Pages](https://canvas.instructure.com/doc/api/pages.html)
- [Calendar events](https://canvas.instructure.com/doc/api/calendar_events.html)
- [Conversations](https://canvas.instructure.com/doc/api/conversations.html)
- [Classic quizzes](https://canvas.instructure.com/doc/api/quizzes.html)
- [Files](https://canvas.instructure.com/doc/api/files.html)
- [Analytics](https://canvas.instructure.com/doc/api/analytics.html)
