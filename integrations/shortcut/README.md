# <img src="https://provider-logos.metorial-cdn.com/shortcut.svg" height="20"> Shortcut

Create, read, update, delete, and search stories and epics. Plan iterations, manage objectives, labels, comments, and checklists, create and edit documents, and discover workspace members, teams, workflows, and custom fields.

## Tools

### Create Document

Creates a new document (Doc) in Shortcut. Docs are used for long-form documentation like design documents, product strategies, and technical specs. Content can be in Markdown or HTML format.

### Create Epic

Creates a new epic in Shortcut. Epics represent larger bodies of work or features composed of multiple stories. They can be assigned to teams, objectives, and have their own workflow states and deadlines.

### Create Iteration

Creates a new iteration (sprint) in Shortcut. Iterations are time-boxed periods of development with a start and end date. Stories can be assigned to iterations for sprint planning.

### Create Objective

Creates a new objective (formerly milestone) in Shortcut. Objectives are top-level strategic goals that connect day-to-day work to broader outcomes. They can be in "to do", "in progress", or "done" states.

### Create Story

Creates a new story in Shortcut. Stories are the fundamental unit of work and can be of type Feature, Bug, or Chore. You can assign the story to an epic, iteration, team, workflow state, and set owners, labels, estimates, deadlines, and custom fields.

### Delete Epic

Permanently deletes an epic by its ID. Stories within the epic are not deleted, but will no longer be associated with the epic. This action cannot be undone.

### Delete Story

Permanently deletes a story by its public ID. This action cannot be undone.

### Get Current Member

Retrieves the authenticated member and current workspace, role, and default workflow.

### Get Document

Retrieves document content by UUID in Markdown (default) or HTML. Call `list_documents` to discover accessible document UUIDs.

### Get Epic

Retrieves full details of an epic by its ID, including description, stats, labels, owners, linked objectives, and workflow state.

### Get Story

Retrieves full details of a story by its public ID, including description, comments, tasks (checklists), labels, custom fields, relationships, and workflow state.

### List Custom Fields

Lists all custom field definitions in the workspace. Custom fields allow organizing stories by Priority, Severity, Technical Area, and more. Returns field IDs and their possible values, which are needed when setting custom fields on stories.

### List Documents

Lists readable documents with UUIDs, titles, and Shortcut URLs.

### List Epics

Lists all epics in the workspace with their status, stats, and metadata.

### List Iterations

Lists all iterations (sprints) in the workspace with their status, dates, and statistics.

### List Labels

Lists all labels in the workspace. Labels can be applied to stories and epics for organization and filtering.

### List Members

Lists all members of the workspace. Use this to look up member UUIDs for assigning owners, followers, or requested-by fields on stories and epics.

### List Objectives

Lists all objectives (formerly milestones) in the workspace. Objectives are top-level strategic goals that epics can be linked to.

### List Story Comments

Lists comment IDs, authors, timestamps, URLs, and reply relationships. Use the IDs with `manage_story_comments`.

### List Teams

Lists all teams (called "groups" in the API) in the workspace. Use this to look up team UUIDs for assigning stories, epics, or iterations to teams.

### List Workflows

Lists all workflows and their states in the workspace. Workflows define the progression of stories through states (e.g., Unstarted → In Progress → Done). Use this to look up workflow state IDs needed for creating or updating stories.

### Manage Labels

Create, update, or delete labels. Labels are used to organize and filter stories and epics.

### Manage Story Comments

Create, update, or delete comments on a story. Provide text for create and update, and a comment ID for update and delete.

### Manage Story Tasks

Create, update, or delete checklist tasks on a story. Tasks can be individually assigned and completed.

### Search Stories

Searches stories using Shortcut query operators and free text. Pass the returned `nextCursor` to retrieve the next page. Page size supports 1 to 250 results.

### Update Document

Updates a document's title or content by UUID. Set `contentFormat: markdown` when writing back Markdown from `get_document`; input otherwise defaults to HTML.

### Update Epic

Updates an existing epic's attributes including name, description, state, owners, teams, objectives, labels, deadlines, and archived status.

### Update Iteration

Updates an existing iteration's attributes including name, dates, description, teams, followers, and labels.

### Update Objective

Updates an existing objective's name, description, state, or categories.

### Update Story

Updates an existing story's attributes. You can change the name, description, type, workflow state, epic, iteration, team, owners, labels, estimate, deadline, custom fields, and archived status.

## Document IDs

Shortcut documents use UUIDs. `create_document` and `list_documents` return `documentUuid`; pass it to `get_document` or `update_document`. The legacy numeric `documentId` input remains available, but current documents require `documentUuid`. Creation timestamps are omitted when the create response does not provide one.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
