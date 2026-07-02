Let me get the actual API documentation page.# Slates Specification for DeskTime

## Overview

DeskTime is an automated time tracking and productivity monitoring software for teams. It tracks employee work hours, application/website usage, productivity levels, and supports project time tracking, shift scheduling, and absence management.

## Authentication

DeskTime uses API keys for authentication.

- **Method:** API Key passed as a query parameter.
- **Parameter name:** `apiKey`
- **How to obtain:** You can get your API Key from https://desktime.com/app/api (also accessible via Settings > API in the DeskTime web app).
- **Usage:** The API key is included as a query parameter in every request. For example:
  ```
  https://desktime.com/api/v2/json/company?apiKey={your_api_key}
  ```
- **Base URL:** `https://desktime.com/api/v2/json/`
- The API key is tied to a specific user account and determines the scope of data accessible (e.g., admin keys can access all employee data).
- There are no OAuth flows or scopes; a single API key grants access based on the account's role and permissions.

## Features

### Company Information

- Retrieve company-level settings and metadata including company name, work start/end times, work duration, working days, tracking schedule, and timezone.

### Employee Data & Productivity Tracking

- The Get Employee endpoint allows you to retrieve information about a single employee to return user tracking data for a specific date.
- The Get Employees endpoint allows you to retrieve information about all employees in your company, with an optional period parameter to return user tracking data for a specific day or month, starting with the given date.
- Parameters include `date` (format: `Y-m-d`), `period` (`day` or `month`), and optional `employeeId`.
- If no date parameter is included in the request URL, it will return information for today's date.
- Tracking data includes productive, neutral, and unproductive time breakdowns, arrival/departure times, and app/website usage.
- Employees can also be looked up by email address.
- **Limitation:** The API can't access the User's profile data (i.e., work starts, work ends and work duration) — user profile/shift schedule configuration is not available via the API.

### Project & Task Management

- Create a new project with an optional task in DeskTime.
- Starts tracking time for a given project and optionally a task.
- Stop tracking time for a given project and optionally a task.
- These endpoints allow programmatic control over project time tracking, enabling integration with external project management or invoicing tools.

### Attendance & Work Hours

- Retrieve employee check-in and check-out times and daily work hour summaries via employee data endpoints.
- Useful for compiling attendance reports and integrating with payroll systems.

### Custom API on Request

- Custom API on request — Request custom API adjustments for specific needs is available on higher-tier plans.

## Events

The provider does not support events. DeskTime's API does not offer webhooks, event subscriptions, or any built-in push notification mechanism for real-time event delivery. The API is read/write REST-based and requires active polling or direct API calls to retrieve updated data.
