# <img src="https://provider-logos.metorial-cdn.com/jotform-logo.png" height="20"> Jotform

Create, manage, and collect data through online forms. Build forms programmatically by defining questions, properties, and email notifications. Retrieve, create, update, and delete form submissions with filtering by date, status, or custom fields. Manage form fields/questions, configure form properties, and set up webhooks for submission notifications. List form folders, generate reports (Excel, CSV, charts), and list uploaded file metadata and download URLs from forms. Access user account details and usage statistics.

## Tools

### Clone Form

Create a duplicate of an existing JotForm form. The cloned form will have the same questions, properties, and settings as the original but will be a new independent form.

### Create Form

Create a new JotForm form with specified questions and properties. Questions are defined as a map of order indices to question objects, each with a type, text, and optional configuration.

### Create Report

Create a new report for a JotForm form. Reports can be generated as CSV, Excel, grid (HTML table), or visual charts.

### Create Submission

Create a new submission for a JotForm form. Provide answers mapped to question IDs. Note: submissions created via the API do **not** trigger webhooks.

### Delete Form

Delete a JotForm form by its ID. This moves the form to the trash. Use with caution as it affects all submissions associated with the form.

### Delete Submission

Delete a form submission by its ID. This permanently removes the submission and its associated data.

### Get Form

Retrieve detailed information about a specific JotForm form including its properties, questions, and settings. Use this to inspect a form's configuration or get its current state.

### Get Submission

Retrieve a single form submission by its ID. Returns complete submission data including all field answers, metadata, and status.

### Get User

Retrieve the authenticated user's account information including profile details, usage statistics, and account limits.

### List Folders

List all form folders in the account. Returns folder hierarchy with names, owners, and contained form IDs. Useful for understanding how forms are organized.

### List Forms

List all forms in the authenticated JotForm account. Supports filtering by status, sorting, and pagination. Use this to browse available forms or find specific forms by title or status.

### List Form Files

List files uploaded through a Jotform form. Returns file metadata and download URLs exposed by the Jotform API.

### List Reports

List reports across all forms or for a specific form. Reports include Excel, CSV, printable charts, and embeddable HTML tables.

### List Submissions

List form submissions. Can retrieve submissions for a specific form or across all forms in the account. Supports filtering, sorting, and pagination.

### Manage Webhooks

List, create, or delete webhooks on a JotForm form. Webhooks send HTTP POST notifications to a URL when a form submission is made through the form UI.

### Manage Form Question

List, retrieve, create, update, or delete questions on a Jotform form. Use this when you need field-level control such as renaming a field, changing dropdown options, or adding a new field.

### Update Form

Update an existing JotForm form's properties, add new questions, or modify existing questions. Combines property updates, question additions, and question management in one tool.

### Update Submission

Update an existing form submission's answer values. Only the provided fields will be updated; other fields remain unchanged.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
