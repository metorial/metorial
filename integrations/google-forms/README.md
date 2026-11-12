# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Google Forms

Create, retrieve, publish, and update Google Forms, surveys, and quizzes. Configure quiz answer keys with point values and automatic feedback. Retrieve form responses and quiz grades, with filtering by timestamp. Set up push notification watches for form schema changes and new response submissions. Supports various question types including short answer, paragraph, multiple choice, checkboxes, dropdowns, linear scales, date, time, and grid questions. Add images and videos to forms.

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

### Set Publish Settings

Publishes or unpublishes a Google Form and controls whether a published form accepts new responses. The tool sets the complete publish state with Google's `publishState` field mask. Legacy forms that do not expose publish settings are not supported by the API.

### Update Form

Updates an existing Google Form using batch update requests. Supports updating form info (title, description), settings (quiz mode), and managing items (adding, updating, moving, or deleting questions, sections, images, and videos). Accepts an array of update requests that are applied atomically. Each request can be one of: **updateFormInfo**, **updateSettings**, **createItem**, **updateItem**, **moveItem**, or **deleteItem**.

## Triggers

**New response** starts a workflow for a first submission after a form watch is enabled. It includes stable form and response IDs, first/latest submission times, collected respondent email, answers keyed by question ID, and uploaded-file references. Answers reflect the latest submission retrieved; editing an existing response does not create another new-response event.

Editable forms authorized for this app are discovered automatically. The existing Drive app-file permission does not expose every form in your account. The connection must have granted that Drive app-file permission and access to your basic profile or email address; permission to read responses alone is not enough. Notifications require Google Pub/Sub delivery set up once for the Google OAuth application: a topic that Google Forms may publish to and an authenticated push subscription in the application's Cloud project. If you connect with your own OAuth application, follow the guided delivery setup and enter its OAuth client ID, topic name, subscription name, and push service account; for the built-in application the service operator has done this. Connections that watch the same form share one response watch on that topic. A response watch that publishes to a different topic is never replaced or removed; if Google does not allow another watch for the form, new responses are still collected by the 15-minute check until a watch can be shared.

Watches renew automatically. A check runs every 15 minutes to recover missed notifications. Each read starts one hour before the newest submission already seen, so a response that becomes visible late is still picked up, and recent responses are remembered only for that hour; editing an older response never creates another event. One read handles at most 20 pages, about 2,000 new responses, or roughly 30 seconds of work, and a larger backlog continues on the next notification or check instead of failing. Deleted responses cannot be recovered. Enabling the event fails until that delivery setup has been saved for the OAuth application.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
