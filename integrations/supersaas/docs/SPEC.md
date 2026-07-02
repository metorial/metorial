Let me get more details on the webhook event types and the appointment/forms API.Now let me get the authentication page details:Now I have all the information I need. Let me compile the specification.

# Slates Specification for Supersaas

## Overview

SuperSaaS is an online appointment scheduling platform that provides booking and calendar management for businesses. The SuperSaaS API provides services that can be used to add online booking and scheduling functionality to an existing website or CRM software. It supports various schedule types including resource/service scheduling and capacity-based scheduling.

## Authentication

SuperSaaS uses an **API key** for authentication. To be able to use the API you would first need to create an API key on the Account Info page inside your account to be able to authenticate.

Two credentials are required for all API requests:

- **Account Name**: Your SuperSaaS account name (not your email address).
- **API Key**: Generated from the Account Info page within your SuperSaaS dashboard.

The API supports three methods of providing these credentials:

1. **Query Parameters**: Pass `account` and `api_key` as URL parameters. For example:
   `https://www.supersaas.com/api/schedules.json?account=account_name&api_key=your_api_key`

2. **HTTP Basic Authentication**: Use the account name as the username and the API key as the password in the `Authorization` header.

3. **MD5 Checksum**: To facilitate calling the API from a client-side script, you can authenticate with an MD5 hash. The hash is calculated from a concatenated string that includes your account name, API key and the username (only for requests that involve user data). Since the calculation uses the API key, which is only known to you and SuperSaaS, it cannot be calculated by anyone else. The checksum is computed as `MD5(account_name + api_key + user_name)`. This method can only be used for user-specific requests.

For server-to-server integrations, Query Parameters or HTTP Basic Authentication are recommended.

## Features

### User Management

The user API allows you to create, read, update and delete users from your account. It also has specialized methods to log in a browser while creating or updating a user object at the same time. If your site has its own login system and database with user information, you can use this API to sync it with the SuperSaaS user database. This allows you to provide your users with a way to register and log in only once.

- Users can be identified by SuperSaaS internal ID, username, or a foreign key from your own database (appended with `fk`, e.g., `1234fk`).
- Supports single sign-on by creating/updating user records and logging them in simultaneously.

### Appointment Management

Appointment database API allows you to read or update one or more appointments. This API also provides methods to retrieve a subset of recent changes, or of a specific user, or to retrieve information about availability in a schedule. There is some variation in the supported endpoints that depends on the type of schedule being queried.

- Create, read, update, and delete appointments on a given schedule.
- Retrieve upcoming appointments for a schedule or a specific user.
- Query availability within a schedule.
- Retrieve recent changes since a given date, useful for syncing.
- Appointments can include custom form data.
- Some endpoints differ based on schedule type (e.g., capacity schedules have different slot-related endpoints).

### Form Management

Form database API allows you to read custom forms from your account. If forms are attached to an appointment or to a user, it is typically more convenient to retrieve them through those APIs instead.

- Retrieve a list of completed forms by form template, optionally filtered by date.
- Retrieve a single form by its ID.
- Stand-alone forms and forms attached to appointments/users are both supported.

### Promotion Codes

The Promotion API allows you to create coupon codes for promotions or retrieve usage information about existing coupon codes.

- Create and duplicate promotion/coupon codes.
- Query usage details of existing codes.

### Schedule & Resource Information

The information API can be used to get a list of schedules or forms in your account and their internal IDs. It also provides endpoints to inquire about other objects, such as endpoints that list the services, resources and groups.

- List all schedules and forms in the account.
- List resources or services for a specific schedule.
- Retrieve available fields configured for a schedule.
- List user groups.
- Resource listing is not available for capacity-type schedules.

## Events

Webhooks are user-defined callbacks that inform other applications or websites about events happening on your SuperSaaS account in near real-time. This feature is only available to subscribers.

Webhooks can be created manually via the SuperSaaS dashboard, or programmatically using the REST hooks protocol. Webhooks are created via `POST /api/hooks` specifying the event code, parent ID (account, schedule, or form ID depending on event type), and target URL. They can be deleted via `DELETE /api/hooks`.

Webhook payloads are sent as JSON by default and can be customized. The payload includes `event` and `role` fields for filtering.

### Supported Event Categories

- **New User**: Fires when a user registers for the account. Tied to the account.
- **Changed User**: Fires when user registration information is updated or deleted (by the user or admin). Includes new, change, and delete events. Tied to the account.
- **New Appointment**: Fires when a new appointment is made on a specific schedule. Tied to a schedule.
- **Changed Appointment**: Some events can be monitored either for a "new" event, or a "changed" event. The "changed" event includes every change, so it also fires on "new" and "delete". Covers create, edit, place (from waiting list), pending, destroy, restore, approve, and revert events. Tied to a schedule.
- **New Stand-alone Form**: Fires when a stand-alone form is filled out (not for forms attached to appointments). Tied to a form.
- **Updated Stand-alone Form**: Fires on any change to a stand-alone form, including new, change, delete, and restore. Tied to a form.
- **Send Mail**: Fires on all emails sent from the account. When active, SuperSaaS stops sending the email itself, allowing you to route it through your own mail server. Tied to the account.
- **Reminder**: Fires on appointment reminders. When active, SuperSaaS stops sending the reminder itself. Tied to a schedule.
- **Follow-up**: Fires on follow-up notifications. When active, SuperSaaS stops sending the follow-up itself. Tied to a schedule.
- **Purchase**: Fires when a user makes a purchase in the account's shop. Tied to the account.
