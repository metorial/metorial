# D2L Brightspace capability reference

## Connection

OAuth uses the [documented authorization and token endpoints](https://docs.valence.desire2learn.com/basic/oauth2.html). The authorization code flow supports expiring access tokens and refresh tokens. An existing bearer token is also supported. Provide the HTTPS origin of the institution’s instance with the credentials. API version overrides are separate connection settings: LP 1.49, LE 1.82, BAS 1.4 by default.

OAuth requests the declared scopes, including the documented `core:*:*` fallback for APIs without specific scopes. Group tools request the specific `groups:group:read` and `groups:enrollment:create`/`delete` scopes. The connected user’s Brightspace permissions still determine access. Limited bearer tokens can access only their granted operations.

## Tools

| Area | Supported operations | Official API reference |
| --- | --- | --- |
| Users and identity | `get_user` by ID, exact username, email, org-defined ID, or current user; `list_users`, `create_user`, `update_user`, `list_roles` | [Users](https://docs.valence.desire2learn.com/res/user.html) |
| Organization structure | `list_org_units`, `get_org_unit`, `list_org_unit_types` | [Organization structure](https://docs.valence.desire2learn.com/res/orgunit.html) |
| Courses | `get_course`, `create_course`, `update_course`, `delete_course` | [Courses](https://docs.valence.desire2learn.com/res/course.html) |
| Enrollments | `enroll_user`, `unenroll_user`, `list_enrollments`, `get_classlist` | [Enrollments](https://docs.valence.desire2learn.com/res/enroll.html) |
| Grades | `list_grade_items`, `get_grade_value`, `set_grade_value` for numeric grades, `get_final_grades` | [Grades](https://docs.valence.desire2learn.com/res/grade.html) |
| Content | `list_content_modules`, `create_content_module`, `update_content_module`, `delete_content_module`, `get_content_topic` | [Content](https://docs.valence.desire2learn.com/res/content.html) |
| Assignments | `list_assignments`, `get_assignment`, `create_assignment`, `update_assignment`, `delete_assignment`, `get_assignment_submissions` | [Dropboxes](https://docs.valence.desire2learn.com/res/dropbox.html) |
| Quizzes | `list_quizzes`, `get_quiz`, optional questions and attempts | [Quizzes](https://docs.valence.desire2learn.com/res/quiz.html) |
| Discussions | `list_discussion_forums`, `create_discussion_forum`, `create_discussion_topic`, `list_discussion_posts`, `create_discussion_post` | [Discussions](https://docs.valence.desire2learn.com/res/discuss.html) |
| Announcements | `list_announcements`, `get_announcement`, `create_announcement`, `update_announcement`, `delete_announcement` | [News](https://docs.valence.desire2learn.com/res/news.html) |
| Calendar | `list_calendar_events`, `get_calendar_event`, `create_calendar_event`, `update_calendar_event`, `delete_calendar_event` | [Calendar](https://docs.valence.desire2learn.com/res/calendar.html) |
| Groups and sections | `list_groups_sections`, `manage_group_enrollment` | [Groups](https://docs.valence.desire2learn.com/res/groups.html) |
| Awards | `list_awards`, `list_award_associations`, `issue_award`, `revoke_award` | [Awards](https://docs.valence.desire2learn.com/res/awards.html) |

## Behavior and limits

- `get_user` with no lookup fields is the read-only identity operation. `list_enrollments` with no IDs discovers the current user’s course IDs. Organization searches and enrollment listings expose bookmarks for continuation.
- Username searches are exact; the API returns a single user object for username searches, arrays for email/org-defined-ID searches, and a paged envelope for unfiltered lists.
- Complete-resource updates read the current resource before changing specified fields. Unspecified dates, visibility, descriptions, activation, and grade comments are preserved. User updates send null for the system-pronouns field to preserve it rather than copying the user’s displayed pronouns. These reads and writes are separate operations; concurrent edits can race.
- Course creation sets `IsActive=true` for LP API 1.59 and later, where that field is required. Use `update_course` to change active status.
- Paged quiz, award, grade-value, and calendar collections follow provider continuation URLs for the same instance and endpoint. Processing stops with an error at 100 pages or an unsafe/repeated URL. Discussion post paging remains caller-controlled.
- Content-module structure entries can include topics. `contentType=0` identifies a module; `contentType=1` identifies a topic, with `topicId` for `get_content_topic`. The historical `moduleId` field remains available on all returned entries.
- Nullable summary fields are omitted while preserving their existing scalar types. Detail readers expose the original resource as `raw`, including null values. Assignment enum names are converted to the numeric values expected in existing summaries.
- Paper and observed assignments complete on evaluation; file, text, and file-or-text assignments complete on submission. Clearing the last due/start/end date disables assignment calendar display, as Brightspace requires a date for a calendar entry.
- Filtering assignment submissions by a user uses the direct user route on LE 1.88 and later. On older versions, it reads the documented all-submissions route and filters user entities locally, which can require a larger response.
- Assignment submission summaries identify individual submissions and count each submission’s files; group submitters are identified through `entityId` and `entityType`.
- Award issuance requires an award already associated with the org unit, an enrolled recipient, and nonempty criteria/evidence. Existing optional input schemas remain compatible; invalid omissions are rejected with an actionable message.
- Forum locking is a legacy API field ignored by LE 1.56 and later. Module and calendar updates retain existing locked/all-day state where appropriate.
- No triggers, file uploads/downloads, quiz authoring, survey administration, Data Hub exports, LTI administration, or SIS operations are implemented.
