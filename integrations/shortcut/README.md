# <img src="https://provider-logos.metorial-cdn.com/shortcut.svg" height="20"> Shortcut

Create, read, update, delete, and search stories, epics, objectives, and iterations for software project management. Manage workflows, teams, labels, custom fields, and documents. Assign stories to sprints, set deadlines and estimates, track workflow state changes, manage story relationships (blockers/blocked), and add comments and checklists. Upload files, link external files, and search across all work items with rich query operators. Receive webhooks for story, epic, comment, and workflow state changes.

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

### Get Document

Retrieves a document by its ID, including its full content.

### Get Epic

Retrieves full details of an epic by its ID, including description, stats, labels, owners, linked objectives, and workflow state.

### Get Story

Retrieves full details of a story by its public ID, including description, comments, tasks (checklists), labels, custom fields, relationships, and workflow state.

### List Custom Fields

Lists all custom field definitions in the workspace. Custom fields allow organizing stories by Priority, Severity, Technical Area, and more. Returns field IDs and their possible values, which are needed when setting custom fields on stories.

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

### List Teams

Lists all teams (called "groups" in the API) in the workspace. Use this to look up team UUIDs for assigning stories, epics, or iterations to teams.

### List Workflows

Lists all workflows and their states in the workspace. Workflows define the progression of stories through states (e.g., Unstarted → In Progress → Done). Use this to look up workflow state IDs needed for creating or updating stories.

### Manage Labels

Create, update, or delete labels. Labels are used to organize and filter stories and epics.

### Manage Story Comments

Create, update, or delete comments on a story. Use the \

### Manage Story Tasks

Create, update, or delete checklist tasks on a story. Tasks are sub-items within a story that can be individually assigned and completed. Use the \

### Search Stories

Searches for stories using Shortcut's query syntax. Supports operators like \

### Update Document

Updates an existing document's title or content.

### Update Epic

Updates an existing epic's attributes including name, description, state, owners, teams, objectives, labels, deadlines, and archived status. Pass \

### Update Iteration

Updates an existing iteration's attributes including name, dates, description, teams, followers, and labels.

### Update Objective

Updates an existing objective's name, description, state, or categories.

### Update Story

Updates an existing story's attributes. You can change the name, description, type, workflow state, epic, iteration, team, owners, labels, estimate, deadline, custom fields, and archived status. Pass \

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
