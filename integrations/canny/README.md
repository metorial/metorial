# <img src="https://provider-logos.metorial-cdn.com/canny-logo.png" height="20"> Canny

Collect, organize, and prioritize user feedback and feature requests. Create, update, and manage feedback posts on boards with voting, comments, and status tracking. Manage users, companies, categories, tags, and changelog entries. Track ideas, insights, and opportunities linked to sales tools. Use AI-powered Autopilot to extract feature requests from text content. Monitor post, comment, and vote events via webhooks.

## Tools

### Change Post Status

Change the status of a feedback post. Optionally notify voters about the status change and include a comment explaining the change.

### Create Changelog Entry

Create a new changelog entry. Entries can be published immediately, scheduled for future publication, or saved as drafts. Supports types (new, improved, fixed), labels, and linking to feedback posts.

### Create Comment

Add a comment to a feedback post. Supports threaded replies via parentId, internal-only comments, image attachments, and optional voter notifications.

### Create or Update User

Create a new user or update an existing one. If a user with the given userId or email already exists, they will be updated. Users can be associated with companies and have custom fields.

### Create Post

Create a new feedback post on a board. Posts represent individual feedback items or feature requests. You can assign a category, set custom fields, attach images, set an ETA, and assign an owner.

### Create Vote

Cast a vote on a feedback post on behalf of a user. Votes increase a post's score and indicate user demand.

### Delete Comment

Permanently delete a comment from a feedback post. This action cannot be undone.

### Delete Company

Permanently delete a company from Canny. This action cannot be undone.

### Delete Post

Permanently delete a feedback post. This action cannot be undone.

### Delete User

Permanently delete a user from Canny. This removes the user and all their associated data. This action cannot be undone.

### Delete Vote

Remove a vote from a feedback post. This reduces the post's score.

### Enqueue Autopilot Feedback

Submit text content (e.g., call transcripts, conversation logs) to Canny's AI-powered Autopilot for automatic feature request extraction and deduplication. Each request consumes one Autopilot credit.

### List Boards

List all feedback boards in your Canny account. Boards are top-level containers where users post and vote on feedback for specific topics (e.g., "Feature Requests", "Bug Reports").

### List Changelog Entries

List changelog entries with optional filtering by label or type. Returns published, scheduled, and draft entries with pagination support.

### List Comments

List comments with optional filtering by board, post, author, or company. Uses cursor-based pagination.

### List Companies

List companies in your Canny account. Supports searching by name and filtering by segment. Companies track organizational data like member count and monthly spend (MRR).

### List Opportunities

List sales opportunities synced from Salesforce or HubSpot that are linked to Canny posts. Shows opportunity value, closed/won status, and linked post IDs.

### List Posts

List and search feedback posts with flexible filtering. Filter by board, author, company, tags, status, or search by keyword. Supports pagination and sorting.

### List Status Changes

List the history of post status changes across your boards. Shows who changed each status, the old and new values, and when the change occurred.

### List Users

List users in your Canny account with cursor-based pagination. Returns user details including name, email, admin status, and custom fields.

### List Votes

List votes on posts with optional filtering by board, post, user, or company. Returns voter details and timestamps.

### Manage Categories

Create, retrieve, list, or delete categories on a board. Categories help organize posts within a board and support parent-child nesting.

### Manage Post Organization

Move a post to a different board, change its category, add/remove tags, or merge posts together. Use the \

### Manage Tags

Create, retrieve, or list tags on a board. Tags are labels that can be applied to posts for flexible categorization and filtering.

### Retrieve Board

Retrieve details about a specific feedback board by its ID. Returns the board's name, post count, privacy settings, and URL.

### Retrieve Post

Retrieve details of a specific feedback post. Lookup by post ID, or by board ID + URL name. Returns the full post including author, board, category, votes, status, tags, and more.

### Retrieve User

Retrieve a user's details by their Canny ID, your application's user ID, or email address. Provide exactly one identifier.

### Update Company

Update a company's details including name, monthly spend (MRR), and custom fields.

### Update Post

Update a feedback post's content fields. Can modify the title, details, ETA, custom fields, and images. For status changes, board moves, or category changes, use the dedicated tools.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
