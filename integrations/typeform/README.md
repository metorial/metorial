# <img src="https://provider-logos.metorial-cdn.com/typeform.png" height="20"> Typeform

Create, retrieve, update, and delete online forms and surveys. Manage form responses, including filtering by date and deleting submissions. Configure webhooks to receive real-time notifications on form submissions and partial responses. Upload and manage images, create and apply visual themes, and organize forms across workspaces with team collaboration. Translate forms into multiple languages, retrieve form insights and analytics, and download files uploaded by respondents.

## Tools

### Create Form

Create a new typeform with specified fields, settings, and optional welcome/thank-you screens. Supports all field types including short text, multiple choice, rating, opinion scale, file upload, and more.

### Delete Form

Permanently delete a typeform and all its associated data including responses, webhooks, and analytics. This action cannot be undone.

### Delete Responses

Delete specific form responses by their tokens. Supports GDPR Right To Be Forgotten compliance by permanently removing response data.

### Download Response File

Download a file uploaded through a Typeform file upload question. Returns the file as base64 content for storage or forwarding.

### Get Form Insights

Retrieve analytics and insights for a typeform, including response counts, completion rates, and question-level metrics.

### Get Form

Retrieve the full definition of a typeform including all fields, settings, logic jumps, welcome/thank-you screens, and theme. Use this to inspect a form's structure before updating it or retrieving responses.

### Get Responses

Retrieve submission responses for a typeform. Supports filtering by date range, search query, completion status, and pagination. Returns structured answer data for each response.

### List Forms

Retrieve a list of typeforms in your account. Optionally filter by search term, workspace, or sort order. Returns form metadata including titles, links, and timestamps.

### List Themes

Retrieve a list of visual themes available in your Typeform account. Themes control the appearance of forms including colors, fonts, and backgrounds.

### List Workspaces

Retrieve a list of workspaces in your Typeform account. Workspaces organize forms and support team collaboration.

### Manage Image

Upload, retrieve, or delete images in your Typeform account. Images can be used in form fields, backgrounds, and choice options.

### Manage Form Messages

Retrieve or update a form's customizable interface messages, such as submit button text, validation copy, progress labels, and file upload prompts.

### Manage Theme

Create, retrieve, update, or delete a visual theme for typeforms. Themes control colors, fonts, backgrounds, and button styles. Apply themes to forms for consistent branding.

### Manage Translation

Manage form translations. Retrieve translation statuses, get translation payloads for specific languages, update translations, auto-translate a form, or delete translations.

### Manage Webhook

Create, retrieve, update, or delete webhooks for a typeform. Webhooks send real-time HTTP POST notifications when a form receives a new response. Supports payload signing with HMAC SHA256 and partial response events.

### Manage Workspace

Create, retrieve, update, or delete a Typeform workspace. Workspaces organize forms and support team collaboration. You can rename workspaces, add or remove members, and move forms between workspaces.

### Patch Form

Safely update supported form-level properties without replacing the full form definition. Use this for title, public/private status, theme, workspace, SEO metadata, and tracking settings.

### Update Form

Update an existing typeform. Performs a full replacement of the form definition. Retrieve the current form first with **Get Form**, modify the desired properties, and pass the complete form data here.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
