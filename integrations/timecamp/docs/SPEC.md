# Slates Specification for TimeCamp

## Overview

TimeCamp is a time tracking software that allows teams and individuals to track time spent on tasks and projects. It provides features for timesheets, attendance tracking, invoicing, billing rates, budgeting, productivity analysis, and reporting across web, desktop, and mobile platforms.

## Authentication

TimeCamp uses **API Key** authentication.

To obtain your API token, log in to your TimeCamp account and click on your avatar in the upper-right corner. Select "Profile Settings" and find your API token at the bottom of the page. The token is also available at: `https://app.timecamp.com/app#/settings/users/me`.

The API token is passed via the `Authorization` HTTP header in requests to the base URL `https://www.timecamp.com/third_party/api/`. For example:

```
Authorization: <your_api_token>
```

The API is available to all subscription plans and is free of charge.

There is no OAuth2 flow or scopes. The token provides access scoped to the authenticated user's account and permissions.

## Features

### Time Tracking & Time Entries

Manage time entries including creating, updating, and retrieving logged time. Time entries can be retrieved, created, and updated. Entries can be filtered by date range and include details such as duration, associated task, and user. Time entries can be marked as billable or non-billable.

### Projects & Tasks

Manage projects, tasks, and time entries. Projects are top-level entities, and tasks are organized hierarchically beneath them as a tree structure. You can create, update, delete, and list projects and tasks. Tags can be assigned to tasks for better classification of tracked time, with optional automatic tag assignment.

### Timer

Control the real-time timer — check its status, start, and stop it programmatically. Useful for live time tracking integrations.

### Users & Groups

Manage users and recreate company structure with user groups. One user can belong to multiple groups and have different roles in each. Retrieve user information and manage team membership.

### Attendance & Away Time

The attendance module registers the total number of work hours per day, as well as exact start and end hours of a working day. Retrieve attendance data and away time records for users, useful for payroll and workforce management.

### Clients

Manage client records that can be associated with projects and invoices. Clients can be listed, created, and updated.

### Invoicing

Create invoices using the invoicing feature and billable time, then send them to clients as a link or PDF. Invoices can be created from tracked time entries or from blank templates. Supports custom billing rates, taxes, and currency settings.

### Billing Rates

Set billing rates with options for international currency, rate value history, and billing types (revenue or cost). Specific billing rates can be set for users, groups, and projects.

### Tags & Geofencing

The API exposes resources for tags, geofencing, and billing rates. Tags allow categorizing time entries; geofencing supports location-based tracking for field workers.

### Computer Activities

Retrieve data about computer activity tracking, including application usage and window titles. This is collected by the desktop application and can be queried by date.

### Timesheet Approvals

Timesheet approvals are available as an API resource. Supports workflows for reviewing and approving employee timesheets.

### Budgeting

Keep an eye on the profitability of projects on an ongoing basis using budgeting. Budgets can be assigned to projects and tracked against actual time spent.

## Events

The provider does not support webhooks or native event subscriptions. Webhook support has been requested as a feature on TimeCamp's feedback board, indicating it is not natively available. Third-party platforms like Zapier and Pipedream use polling mechanisms to detect new tasks and time entries, but TimeCamp itself does not offer a built-in webhook or event subscription system.
