# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Google Forms

Create, retrieve, and update Google Forms, surveys, and quizzes. Configure quiz answer keys with point values and automatic feedback. Retrieve form responses and quiz grades, with filtering by timestamp. Set up push notification watches for form schema changes and new response submissions. Supports various question types including short answer, paragraph, multiple choice, checkboxes, dropdowns, linear scales, date, time, and grid questions. Add images and videos to forms.

## Tools

### Create Form

Creates a new Google Form with a title and optional document title. The created form is initially empty — use the **Update Form** tool to add questions, settings, and other content after creation. Returns the new form's ID, responder URL, and metadata.

### Get Form

Retrieves the full content and metadata of a Google Form by its ID. Returns the form's title, description, settings, all items (questions, sections, images, videos), and quiz configuration. Useful for inspecting a form's structure, verifying changes, or reading question details.

### Get Response

Retrieves a single form response by its response ID. Returns the full response including answers, timestamps, respondent email (if collected), and quiz grades. Useful for inspecting a specific submission in detail.

### List Responses

Lists all responses for a Google Form, with optional filtering by submission timestamp. Returns each response with its answers, timestamps, respondent email, and quiz grades. Supports pagination and timestamp filtering to retrieve only recent submissions.

### Manage Watches

Creates, lists, renews, or deletes push notification watches on a Google Form. Watches deliver notifications to a Google Cloud Pub/Sub topic when form events occur. Supports two event types: **SCHEMA** (form structure/settings changes) and **RESPONSES** (new or updated response submissions).

### Update Form

Updates an existing Google Form using batch update requests. Supports updating form info (title, description), settings (quiz mode), and managing items (adding, updating, moving, or deleting questions, sections, images, and videos). Accepts an array of update requests that are applied atomically. Each request can be one of: **updateFormInfo**, **updateSettings**, **createItem**, **updateItem**, **moveItem**, or **deleteItem**.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
