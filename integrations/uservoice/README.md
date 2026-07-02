# <img src="https://provider-logos.metorial-cdn.com/uservoice.png" height="20"> Uservoice

Manage product feedback, feature requests, and customer ideas. Create, update, and organize suggestions across forums. Track votes and supporters on ideas. Update suggestion statuses through their lifecycle (under review, planned, completed). Manage users, accounts, and teams. Organize feedback with labels and categories. Link suggestions to features for roadmap planning. Upload file attachments to suggestions and notes. Retrieve NPS ratings data. Create and manage internal notes and public comments. Import external users and accounts in bulk. Configure webhooks for suggestion, vote, and status change events.

## Tools

### Add Note

Add an internal note to a suggestion. Notes are only visible to admins and team members, not to end users. Use this for internal discussion and context on feedback.

### Create Suggestion

Create a new suggestion (idea) in a UserVoice forum. Requires a title and forum ID. Optionally assign a category and labels.

### Delete Suggestion

Permanently delete a suggestion (idea) from UserVoice. This action cannot be undone.

### Get Suggestion

Retrieve detailed information about a specific suggestion (idea) by its ID. Includes vote counts, supporter data, status, category, labels, and associated forum.

### Import External Users

Bulk import external users into UserVoice. Associates users from your system with UserVoice users for feedback tracking. Each user can optionally embed an associated external account.

### List Categories

List user-facing categories available within forums. Categories organize suggestions into topics visible to end users. Returns category IDs for use with suggestion creation.

### List Comments

List comments across suggestions. Comments are public discussion on ideas. Filter by suggestion or browse all comments. Supports pagination and date range filtering.

### List Features

List features (roadmap items) in your UserVoice account. Features represent planned product changes that can be linked to suggestions for roadmap planning.

### List Forums

List all feedback forums in your UserVoice account. Forums are distinct areas for collecting ideas on different topics or products. Useful for discovering forum IDs needed by other tools.

### List Labels

List all labels available for organizing suggestions internally. Labels are used by admins to categorize and tag suggestions. Returns label IDs for use with suggestion creation and updates.

### List NPS Ratings

List Net Promoter Score (NPS) ratings submitted by users. View scores, feedback comments, and track changes over time. Useful for measuring customer satisfaction.

### List Statuses

List all available suggestion statuses configured in your UserVoice account. Statuses define the lifecycle stages of suggestions (e.g., under review, planned, completed). Use the returned status IDs with the **Update Suggestion Status** tool.

### List Suggestions

Search and list suggestions (ideas) in UserVoice. Supports filtering by forum, sorting, and pagination. Use this to browse product feedback, find popular ideas, or audit recent submissions.

### List Supporters

List supporters across suggestions. Supporters are end users who have voted for or supported an idea. Filter by suggestion to see who supports a specific idea.

### List Users

List users in your UserVoice account. Returns both admin and end users with their profile data, satisfaction scores, and activity metrics. Supports filtering and pagination.

### Manage Forum

Create a new forum or update an existing one. Forums are distinct areas for collecting ideas on different topics or products. Provide a **forumId** to update, or omit it to create a new forum.

### Manage Supporter

Add or remove a supporter (vote) on a suggestion. To add a supporter, provide a **suggestionId**. To remove, provide a **supporterId**. Supporters represent end users who support an idea.

### Update Suggestion Status

Change the status of a suggestion and optionally notify supporters. Creates a status update record that closes the feedback loop with customers. Use **List Statuses** to find available status IDs.

### Update Suggestion

Update an existing suggestion's title, body, category, labels, or status. Only the fields you provide will be updated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
