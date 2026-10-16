# Canvas

Manage Canvas LMS courses, assignments, enrollments, grading, modules, pages, discussions, calendar events, conversations, classic quizzes, files, and course analytics.

Connect with OAuth2 using your institution's Canvas domain and developer key. Personal access tokens are available for testing your own account; applications used by multiple users must use OAuth2. The Canvas domain is stored with the authenticated connection.

Use `who_am_i` to inspect the connected user, `list_courses` to discover accessible courses, and `list_course_creation_accounts` to discover account IDs for course creation. Read tools expose the provider's original metadata. Lists follow Canvas pagination; module item expansion also fetches items that Canvas omits from inline results.

`download_file` prepares a downloadable file and returns its original metadata and URL. Course, file, grading, messaging, and analytics permissions remain controlled by Canvas. New Quizzes and Live Events are not included.

See [the API specification](docs/SPEC.md) for supported workflows and official API references.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
