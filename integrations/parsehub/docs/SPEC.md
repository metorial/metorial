Let me get the full API reference page for more details on endpoints and webhooks.# Slates Specification for Parsehub

## Overview

ParseHub is a web scraping platform that allows users to extract structured data from websites without coding, using a visual desktop client. The API enables programmatic management of scraping projects, execution of scraping runs, and retrieval of extracted data in JSON or CSV format.

## Authentication

Each request must include your API Key for authentication. ParseHub uses a single API key mechanism — there is no OAuth2 or other authentication method.

- **Type:** API Key
- **Parameter name:** `api_key`
- **How to obtain:** The API key is located under your account settings. In the ParseHub desktop app, click on the profile icon that says "My Account" in the left sidebar, which brings you to your "Account Settings" where you can copy and paste your API key. It can also be retrieved at `https://parsehub.com/account`.
- **How to use:** The API key is passed as a query parameter (`api_key`) for GET and DELETE requests, or as a form-encoded body parameter for POST requests.
- **Base URL:** `https://www.parsehub.com/api/v2/`

Example:

```
GET https://www.parsehub.com/api/v2/projects?api_key={YOUR_API_KEY}
```

## Features

### Project Management

Retrieve a list of all scraping projects in your account, or get details of a specific project. There are two primary types of objects that the ParseHub API operates with: projects and runs. Each project is identified by a unique **project token**, found in the project's settings in the ParseHub client.

- Projects contain scraping instructions (templates) configured via the desktop client.
- You can retrieve project metadata including its list of recent runs.
- Projects cannot be created or edited via the API; they must be configured through the ParseHub desktop client or web app.

### Running Scraping Jobs

Start a scraping run for a given project on the ParseHub cloud. This will start running an instance of the project on the ParseHub cloud.

- **start_url** (optional): Override the default starting URL for the project.
- **start_template** (optional): Specify which template to use as the entry point.
- **start_value_override** (optional): This can be any JSON value. It will be passed to your project, and your project can use it to change what it does. Useful for dynamic filtering or parameterized scraping.
- **send_email** (optional): Send a notification email when the run completes.
- A run progresses through statuses: The status of the run can be one of initialized, running, cancelled, complete, or error.

### Retrieving Extracted Data

Download the structured data extracted by a completed run in JSON format.

- Retrieve data for a specific run using its run token.
- For simple use cases, you can use the last ready run data endpoint, which will automatically get the data from the most recent run where data_ready is truthy.

### Cancelling and Deleting Runs

- **Cancel a run:** Cancels a run and changes its status to cancelled. Any data that was extracted so far will be available.
- **Delete a run:** This cancels a run if running, and deletes the run and its data.

## Events

ParseHub supports webhooks for monitoring the status of scraping runs.

### Run Status Changes

ParseHub will send a POST request to the webhook URL whenever any of the project's runs' status or data_ready fields change. The POST body will be the run object.

- You can set up a webhook for a project in the 'Settings' tab of the project in the ParseHub client.
- This should be a valid URL that is visible from the internet.
- The webhook fires on any status transition (e.g., initialized → running → complete, or error).
- It also fires when `data_ready` changes, indicating extracted data is available for download.
- If the status of a run is error, ParseHub may automatically retry the run. In this case, there will be an additional new_run field with the metadata (run token, etc.) for the restarted run.
- Webhooks are configured per project, not globally or per run.
