# Blackboard Learn integration

## Connection

Connect to the institution's Learn instance URL using either user-authorized
OAuth (`oauth_3lo`) or an application's client credentials
(`client_credentials`). An administrator must register the application on the
Learn instance and grant the required Learn entitlements.

The user authorization flow requests `read write offline`, exchanges an
authorization code for an access token, and uses the refresh token for renewal.
Client-credentials connections renew by requesting another client-credentials
token. The instance URL and token expiry are retained with authentication.
Existing saved connections may use their previously stored instance URL until
the next authentication renewal.

## Available operations

| Area | Tools |
| --- | --- |
| Connection identity | `who_am_i` |
| Courses | `create_course`, `get_course`, `update_course`, `delete_course`, `list_courses` |
| Users | `create_user`, `get_user`, `update_user`, `delete_user`, `list_users` |
| Enrollments | `enroll_user`, `unenroll_user`, `list_enrollments`, `get_enrollment`, `update_enrollment` |
| Course content | `create_content`, `get_content`, `list_content`, `update_content`, `delete_content` |
| Grade columns | `create_grade_column`, `get_grade_column`, `list_grade_columns`, `update_grade_column`, `delete_grade_column` |
| Grades | `record_grade`, `get_grade`, `list_grades` |
| Course announcements | `create_announcement`, `list_announcements`, `update_announcement`, `delete_announcement` |
| Groups | `create_group`, `list_groups`, `update_group`, `delete_group`, `manage_group_members` |
| Attendance | `create_attendance_meeting`, `list_attendance_meetings`, `record_attendance`, `list_attendance_records` |
| Assignment attempts | `list_attempts`, `get_attempt`, `grade_attempt` |
| Calendars | `list_calendars`, `list_calendar_items`, `create_calendar_item` |
| Discovery | `list_terms`, `list_data_sources` |

## Behavior and limits

- List tools return one page and `hasMore`; advance `offset` to retrieve the next
  page. Offsets, limits, positions, attempt counts, and member limits must be
  whole numbers. Scores retain fractional precision and accept zero.
- Discover course IDs with `list_courses`, term IDs with `list_terms`, data
  source IDs with `list_data_sources`, calendar IDs with `list_calendars`, and
  grade column IDs with `list_grade_columns`.
- Creating a user requires password, first name, and last name at invocation
  time. These inputs retain their existing optional schema shape.
- User profile fields depend on Learn entitlements and visibility settings. A
  username may be absent from a visible user profile.
- `FixedNumDays` course availability uses `availability.duration.daysOfUse`.
- External content links use `contentHandlerUrl`. Content positions are zero
  based. Submission text is returned as `studentSubmission`; an attempt's
  `text` field is its text grade.
- Grade columns default to manual grading, or attempts grading when due date
  or attempt settings are supplied. Creation includes the provider-required
  anonymous-grading settings, defaulting to `None`. Zero possible points and zero allowed
  attempts are sent unchanged; Learn uses zero attempts for unlimited attempts.
- Course announcements support permanent or date-restricted availability.
  `DateRange` maps to the provider's `Restricted` value. `Term` resolves the
  course's associated term dates and reports an error when no date range is
  available. Login and course-display flags are system-announcement settings;
  requesting them as true for a course announcement reports an error.
- Group `SignupSheet` enrollment maps to self-enrollment with a signup sheet.
  In Ultra courses, standalone groups should be associated with a content item
  using Learn's content-group APIs; those associations are outside this tool set.
- Creating an attendance meeting requires title, start, and end at invocation
  time. Attendance inputs retain uppercase statuses and send the provider's
  title-case equivalents. An existing record is updated; a confirmed missing
  record is created. API-created meetings' attendance is managed through the API.
- Calendar date ranges can span at most 16 weeks. `OfficeHours` items need
  recurrence settings. LTI launch deep-link details are optional for Course items.
  Gradebook calendar items are created through grade column operations.

## Provider references

Contracts were checked against the official [Learn API
reference](https://developer.anthology.com/portal/displayApi/Learn) and its
[OpenAPI document](https://devportal-docstore.s3.amazonaws.com/learn-swagger.json)
(version `4001.0.0`, retrieved 2026-10-15). The official [attendance
walkthrough](https://github.com/blackboard/anthologydevdocs/blob/main/docs/blackboard/rest-apis/hands-on/attendance.md)
also documents record creation/update and API-managed attendance.

API availability and permissions depend on the institution's Learn release and
entitlements. Local static verification does not establish provider acceptance.

The OpenAPI property description says Course calendar items require an LTI
launch deep link, but the structural required-field list excludes it and the
official [calendar creation guide](https://github.com/blackboard/anthologydevdocs/blob/main/docs/blackboard/rest-apis/hands-on/calendar-api.md#create-a-calendaritem)
shows Course creation and results without a deep link. The integration therefore
accepts ordinary Course events without a deep link and forwards one when supplied.
