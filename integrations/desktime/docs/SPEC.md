# DeskTime integration specification

DeskTime tracks employee work hours, application and website usage, productivity, and project activity.

## Authentication

Use the API key from [DeskTime API settings](https://desktime.com/app/api). Requests send the key in the `X-API-Key` header, as required by the [current authentication documentation](https://help.desktime.com/hc/en-us/articles/25494558790685-Introduction-to-the-DeskTime-API). Some individual endpoint articles still show older query authentication examples. The base URL is `https://desktime.com/api/v2/json`.

The connected employee is resolved with `GET /employee/basic` without an employee ID. Account permissions determine which employee and company information is accessible. There is no OAuth token refresh flow.

## Tools

| Key | Provider request | Behavior |
| --- | --- | --- |
| `get_current_user` | `GET /employee/basic` | API key owner ID, name, email, and today's tracking information. |
| `get_company_info` | `GET /company` | Company account metadata and work settings, plus the complete response. |
| `get_employee` | `GET /employee` | Existing employee tracking lookup by ID or email; omit both for the connected user. |
| `get_employees` | `GET /employees` | Company tracking data grouped by date and employee ID, with optional date and `day` or `month` period. |
| `get_projects` | `GET /projects` | Active projects and related tasks; excludes archived projects. |
| `get_employee_projects` | `GET /employee/projects` | Employee tracking information and tracked project activity for a date. |
| `create_project` | `POST /create-project` | Project creation with optional task, sent as query parameters; resolves the project response envelope and exposes the created project ID. |
| `start_project_tracking` | `GET /start-project` | Project/task names in query parameters; requires a confirmed `started: true` response. |
| `stop_project_tracking` | `GET /stop-project` | Project/task names in query parameters; requires a confirmed `stopped: true` response. |

Date inputs require real dates in `YYYY-MM-DD` format. Omitted dates use today. Call `get_employees` to discover employee IDs and `get_projects` to discover project and task names. Selecting both employee ID and email is rejected rather than silently ignoring one.

## Compatibility and limits

The existing `/employee` request and email lookup are preserved. The current employee article documents `/employee/basic` and only an ID selector, so continued legacy route/email support needs live verification; omission alone does not establish a removed endpoint. New identity behavior uses the currently documented route.

All tools retain the complete provider response. Company work settings map the current `work_starts`, `work_ends`, `work_start_tracking`, `work_stop_tracking`, and `timezone_identifier` names, with legacy field fallbacks. Existing optional company fields retain their declared types and omit values that do not match those types. Employee counts deduplicate employee IDs across date groups. Project activity also preserves the full employee response because the provider's public project example omits the detailed project shape.

HTTP errors, invalid input, explicit API errors, invalid response shapes, and unconfirmed tracking changes are reported as service errors. Requests have a 30-second timeout. No live provider calls or automated provider tests were performed for this refresh.

## Official sources

- [API and authentication](https://help.desktime.com/hc/en-us/articles/25494558790685-Introduction-to-the-DeskTime-API)
- [Company account](https://help.desktime.com/hc/en-us/articles/25494763327901-Using-the-Account-endpoint-via-API)
- [Employee data and current user](https://help.desktime.com/hc/en-us/articles/25494877861789-Retrieving-employee-data-via-API)
- [All company employees](https://help.desktime.com/hc/en-us/articles/25495139812637-Retrieving-all-company-employees-via-API)
- [Active projects](https://help.desktime.com/hc/en-us/articles/25495195415453-Retrieving-projects-via-API)
- [Employee project activity](https://help.desktime.com/hc/en-us/articles/25494912262301-Retrieving-employee-projects-data-via-API)
- [Create projects](https://help.desktime.com/hc/en-us/articles/25495264299293-Creating-a-project-via-API)
- [Start and stop tracking](https://help.desktime.com/hc/en-us/articles/25495406925853-Starting-and-stopping-a-project-and-task-via-API)
