# <img src="https://provider-logos.metorial-cdn.com/lever.png" height="20"> Lever

Manage candidates, opportunities, and hiring pipelines in Lever's applicant tracking system (ATS) and CRM. Create, update, and list job postings with descriptions, requirements, and categories. Track candidates through pipeline stages, archive or hire them, and manage their contact information, resumes, files, and tags. Schedule and manage interview panels, assign interviewers, and collect structured feedback via customizable forms and templates. View offers including compensation, status, and signature tracking. Create and manage hiring requisitions with headcount tracking, compensation bands, and approval workflows. Manage users with access roles and external directory mappings. Retrieve EEO responses, diversity surveys, audit events, referrals, sources, and archive reasons. Upload files and submit applications on behalf of candidates. Listen for webhooks on candidate stage changes, hires, interview events, contact updates, and application creation.

## Tools

### Add Note

Add a note to an opportunity in Lever. Notes can be used to record internal feedback, observations, or any other relevant information about a candidate.

### Create Opportunity

Create a new opportunity (candidacy) in Lever. Provide candidate contact information and optionally assign to a posting, stage, owner, and tags. Lever automatically deduplicates candidates by email address.

### Get Opportunity Activity

Retrieve activity for a specific opportunity including notes, feedback, interviews, offers, applications, resumes, and referrals. Select which types of activity to fetch.

### Get Opportunity

Retrieve a single opportunity by ID with full details including contact info, applications, feedback, notes, offers, resumes, and files. Use the expand parameter to include related objects.

### Get Pipeline Metadata

Retrieve pipeline configuration metadata from Lever including stages, archive reasons, sources, and tags. Select which types of metadata to fetch. Useful for looking up stage IDs, archive reason IDs, and available tags/sources.

### List Opportunities

List and search opportunities (candidacies) in Lever. Supports filtering by tags, email, origin, posting, stage, archive status, and date ranges. Returns paginated results with candidate contact information.

### List Postings

List job postings in Lever with optional filtering by state, team, department, location, and commitment. Returns posting details including job descriptions, categories, and distribution channels.

### List Users

List users in the Lever account. Supports filtering by email and including deactivated users.

### Manage Interview

Create, update, or delete interviews and panels for opportunities. Use this to schedule interviews, assign interviewers, and manage interview panels.

### Manage Posting

Create a new job posting or update an existing one. Supports setting posting text, categories (team, department, location, commitment), state, distribution channels, salary ranges, and workplace type.

### Manage Requisition

Create, update, or delete a hiring requisition. Requisitions support headcount tracking, compensation bands, custom fields, and associations to job postings. Requires API-management of requisitions to be enabled.

### Manage User

Create, update, deactivate, or reactivate a Lever user. Supports setting access roles, name, email, and external directory ID for HRIS integration.

### Update Contact

View or update a contact's information in Lever. Contacts represent unique individuals and are shared across all of their opportunities. Updating a contact affects all their opportunities.

### Update Opportunity

Update an opportunity in Lever. Supports changing pipeline stage, archiving/unarchiving, managing tags, links, and sources. Multiple updates can be performed in a single call.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
