Let me fetch the Swagger API documentation and check for webhook support.Let me try to access the actual Swagger/API docs in a machine-readable format:Let me try to find the Pipedream integration page to understand what API endpoints are available:Now I have enough information to write the specification. Based on my research, BugBug is a low-code test automation tool with a public API that uses token-based authentication. The API allows running tests/suites and retrieving project data. There's no evidence of webhook support.

# Slates Specification for Bugbug

## Overview

BugBug is a codeless test automation tool designed for web application testing. It enables users to create, edit, and execute automated end-to-end tests directly in a web browser—without writing code. The tool supports both local and cloud execution, making it suitable for individuals and scaling teams.

## Authentication

BugBug uses API token authentication. You need to take the API token of the project you want to work with. You will find that key in the BugBug web app in the Integration tab.

When making API requests, the API key must be provided with the `Token` prefix, e.g. `"Token abcde12345"`. This value is passed in the `Authorization` header.

The API base URL is `https://app.bugbug.io`.

- **Method**: API Token
- **Header**: `Authorization: Token <your-api-token>`
- **Where to find it**: BugBug web app → Integrations tab in the side menu
- **Scope**: Each token is scoped to a specific project

API access is available on paid plans (PRO and above).

## Features

### Test Management

You can run tests and suites in the cloud using BugBug's public API. The API allows you to list tests within a project, retrieve test details, and trigger individual test runs in the cloud. You can pass a specific test ID, profile name, and custom variables (key-value pairs) when triggering a run.

- Tests can be run with variable overrides to test different data combinations.
- Cloud Runner is only available on paid plans.

### Suite Management

You can organize tests into Suites to quickly run several tests at once. By default BugBug has one suite called "All tests", where you will find all tests created in a project. All newly created tests are automatically added to this suite. The API allows listing suites, retrieving suite details, and triggering suite runs in the cloud.

- Suites can be scheduled to run in the cloud and are useful for working with different environments.
- Profile names can be specified to run suites with different variable configurations (e.g., different environments or languages).

### Test Run Results

The API allows retrieving test run and suite run results, including pass/fail status and run IDs. Reports can be exported in JUnit XML format. Data can also be exported in formats including JSON and CSV.

### Project Data Access

The API provides an easy way to check your project data outside of the BugBug Web App. You can retrieve information about tests, suites, and their configurations within a project.

## Events

The provider does not support events. BugBug does not offer webhooks or purpose-built polling mechanisms through its API. Notifications for test results are handled via email and Slack (through Zapier), but these are not programmable event subscriptions.
