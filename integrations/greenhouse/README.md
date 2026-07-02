# <img src="https://provider-logos.metorial-cdn.com/greenhouse.png" height="20"> Greenhouse

Manage recruiting workflows in the Greenhouse applicant tracking system (ATS). Create, read, update, and delete candidates, applications, jobs, and offers. Track candidates through hiring stages, manage interview schedules and scorecards, and handle offer approval workflows. Ingest candidates from external sources such as agencies and job portals. Build custom career sites and job boards. Manage organizational data including departments, offices, users, custom fields, and rejection reasons. Handle employee onboarding profiles and tasks. Receive real-time webhook notifications for candidate, application, job, interview, and organization events. Supports prospect management, candidate merging, GDPR anonymization, and assessment integrations.

## Tools

### Add Candidate Note

Add a note to a candidate's activity feed in Greenhouse. Notes can have different visibility levels (admin only, private, or public). Requires the **On-Behalf-Of** user ID in config.

### Advance or Move Application

Advance an application to the next interview stage, or move it to a specific stage. Use **advance** to progress to the next stage automatically, or **move** to jump to a specific target stage. Requires the **On-Behalf-Of** user ID in config.

### Create Candidate

Create a new candidate in Greenhouse. You can optionally associate the candidate with one or more jobs by providing application job IDs. Requires the **On-Behalf-Of** user ID in config.

### Create Job

Create a new job in Greenhouse based on a template job. The template job's settings, stages, and configuration will be copied. Requires the **On-Behalf-Of** user ID in config.

### Get Application

Retrieve detailed information about a specific application by its ID. Returns application status, current stage, source, associated jobs, rejection reason, and custom fields.

### Get Candidate

Retrieve detailed information about a specific candidate by their ID. Returns full candidate profile including contact information, tags, custom fields, and associated applications.

### Get Job

Retrieve detailed information about a specific job by its ID. Returns job details including departments, offices, hiring team, openings, stages, and custom fields.

### Get User

Retrieve detailed information about a specific Greenhouse user by their ID. Returns user name, email, admin status, and account details.

### List Applications

List and filter applications in Greenhouse. Filter by job, status (active, rejected, hired), or date ranges. Returns paginated results with current stage and source information.

### List Candidates

List and search candidates in Greenhouse. Supports filtering by email, date ranges, and associated job. Returns paginated results.

### List Departments

List all departments in Greenhouse. Returns department names, hierarchy (parent/child relationships), and external IDs.

### List Jobs

List and filter jobs in Greenhouse. Filter by status (open, closed, draft), department, or office. Returns paginated results with department, office, and opening information.

### List Offers

List offers in Greenhouse. Can list all offers globally or filter by a specific application. Supports filtering by status and date ranges.

### List Offices

List all offices in Greenhouse. Returns office names, hierarchy (parent/child relationships), locations, and external IDs.

### List Scheduled Interviews

List scheduled interviews in Greenhouse. Filter by application or date ranges. Returns interview details including time, location, interviewers, and scorecard status.

### List Users

List users in Greenhouse. Supports filtering by email and date ranges. Returns paginated results with user details and permissions info.

### Manage Candidate Tags

Add or remove tags on a candidate in Greenhouse. Use the action field to specify whether to add or remove the tag. Requires the **On-Behalf-Of** user ID in config.

### Reject Application

Reject a candidate's application. Optionally specify a rejection reason, notes, and whether to send a rejection email. Requires the **On-Behalf-Of** user ID in config.

### Update Candidate

Update an existing candidate's information in Greenhouse. Only provided fields will be updated. Requires the **On-Behalf-Of** user ID in config.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
