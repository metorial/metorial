# <img src="https://provider-logos.metorial-cdn.com/ashby.svg" height="20"> Ashby

Manage the full recruiting lifecycle in an applicant tracking system. Create, update, search, and list candidates, applications, and jobs. Track applications through hiring pipeline stages, change stages and sources, and transfer between jobs. Schedule and manage interviews, interviewer pools, and interview plans. Create, update, and approve offers. Manage job postings (publish, unpublish, update content) and job boards. Create and track openings (headcount). Manage organizational structure including departments, locations, and users. Set custom fields, add tags, notes, and files to candidates. Upload resumes, anonymize candidates, and handle referrals. Generate reports, submit feedback, create survey requests, and add assessments. Receive webhooks for candidate hires, stage changes, application updates, interview schedules, job and offer changes, and more.

## Tools

### Create Application

Creates a new application for a candidate on a job in Ashby. An application represents a candidate's progression through the hiring pipeline for a specific job. Optionally specify an interview plan, starting stage, source, or credited user.

### Create Candidate

Creates a new candidate in Ashby with name, email, phone, and social links. Returns the created candidate's ID and basic profile information.

### Create Job

Creates a new job in Ashby with a title and optional location, department, and default interview plan. Returns the created job's ID and basic details.

### Get Candidate

Retrieves detailed information about a candidate. Can look up by ID or search by email/name. When searching by email or name, returns the first matching candidate.

### List Applications

Lists applications with pagination or retrieves detailed information about a specific application. Applications represent a candidate's progress through the hiring pipeline for a particular job.

### List Jobs

Lists or searches jobs in Ashby. Can paginate through all jobs or search by term and status. When a search term or status filter is provided, the search endpoint is used instead of the list endpoint.

### List Organization Data

Lists departments, locations, users, sources, archive reasons, candidate tags, or interview stages from the Ashby organization. Returns results in a consistent format regardless of resource type.

### Manage Interview Schedule

Creates, updates, cancels, or lists interview schedules in Ashby. Use this tool to coordinate interview scheduling for candidates in the hiring pipeline.

### Manage Offer

Creates, retrieves, lists, updates, approves, or starts offers in Ashby. Use this tool to manage the full offer lifecycle for candidates in the hiring pipeline.

### Set Custom Field

Sets a custom field value on an Ashby entity. Use the list organization tool with \

### Update Application

Updates an existing application in Ashby. Supports multiple actions: change the interview stage (optionally with an archive reason), change the application source, transfer the application to a different job, and add or remove hiring team members. Multiple actions can be performed in a single call.

### Update Candidate

Updates a candidate's profile in Ashby. Supports changing name, email, phone, social links, adding tags, creating notes, and assigning to projects. Multiple operations can be performed in a single call.

### Update Job

Updates a job's details, status, or compensation. Supports changing the title, location, department, status, and compensation in a single call.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
