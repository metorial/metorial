# <img src="https://provider-logos.metorial-cdn.com/surveymonkey.png" height="20"> Surveymonkey

Create, distribute, and analyze online surveys. Manage surveys with multiple question types, pages, and languages. Distribute surveys via email, SMS, weblink, and popup collectors. Retrieve and filter survey responses with full answer details. Manage contact lists and send invite messages to recipients. Share survey results publicly or with specific users. Organize team collaboration through workgroups and groups. Set up webhooks for real-time response event notifications.

## Tools

### Create Survey

Create a new survey. You can create a blank survey, copy from an existing survey, or use a template. Provide a title and optional settings like language and folder assignment.

### Delete Survey

Permanently delete a survey and all its associated data including responses, collectors, and pages.

### Get Responses

Retrieve survey responses with full answer details. Returns expanded responses including all page, question, and answer data. Supports filtering by date range, status, and collector. Use **simple** mode to include human-readable question/answer text alongside IDs.

### Get Survey

Retrieve detailed information about a specific survey, including its full structure with pages and questions. Use the **includeDetails** flag to fetch the complete survey design with all question and answer option IDs.

### Get Current User

Retrieve details about the authenticated SurveyMonkey user, including account type, plan details, and available features.

### List Surveys

Retrieve a paginated list of surveys owned by or shared with the authenticated user. Supports filtering by title and modification date, and sorting by various fields.

### Create Collector

Create a new collector for a survey to start gathering responses. Collectors can be weblinks, email invitations, SMS, or popup surveys. Configure settings like close date, redirect URL, anonymity, and response limits.

### List Contact Lists

Retrieve all contact lists in the account. Contact lists are used to organize recipients for email and SMS survey invitations.

### Send Survey Invitation

Compose and send an email or SMS invitation message through a collector. This creates the message, adds contact list recipients, and sends it. The collector must be of type **email** or **sms**.

### Update Survey

Update properties of an existing survey such as its title, nickname, language, or folder assignment. Only provided fields will be modified.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
