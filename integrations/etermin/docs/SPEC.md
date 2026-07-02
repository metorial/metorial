# Slates Specification for eTermin

## Overview

eTermin is a cloud-based online appointment scheduling platform that allows businesses to offer 24/7 booking via their website, Google search, and social media. It supports calendar synchronization with platforms like Google, Outlook, and iCloud, helping organizations keep appointments organized and up to date. The platform includes customizable service and personnel management, as well as basic customer management tools to streamline interactions.

## Authentication

eTermin uses HMAC-based API key authentication. The standard API URL is `https://www.etermin.net/api/{resource}`. In every request you must carry with it an API key, a signature, and a randomly generated salt string.

**Credentials required:**

- In the eTermin dashboard sidebar, click on the "API" option. On the page that appears, copy the **Public API Key** and **Private API Key** displayed.

**How to authenticate each request:**

Every API request must include three HTTP headers:

| Header      | Description                                                                      |
| ----------- | -------------------------------------------------------------------------------- |
| `publickey` | Your Public API Key from the eTermin dashboard.                                  |
| `salt`      | A randomly generated string (e.g., a GUID or random number), unique per request. |
| `signature` | An HMAC-SHA256 hash of the salt using the Private API Key, then Base64-encoded.  |

**Signature generation process:**

1. Generate a random salt string.
2. Compute an HMAC-SHA256 hash of the salt using the Private API Key as the secret key.
3. Base64-encode the resulting hash.
4. Include the `publickey`, `salt`, and `signature` as HTTP headers in every request.

## Features

### Appointment Management

Create, read, update, and delete appointments in your eTermin account. Triggers are available when a new appointment is booked through the appointment booking page or an appointment was manually created in the eTermin calendar. Appointments include details such as start/end times, booker contact information, selected services, calendar assignment, notes, and custom fields.

### Contact Management

Almost every object in eTermin, including contacts, can be manipulated using the API. You can create, retrieve, update, and delete contacts. Contact data includes fields such as name, email, phone, address, birthday, and customer number.

### Calendar Management

List and manage calendars within the eTermin account. You can list all available calendars and then look up available time slots on a certain date in different calendars. Calendars can be filtered by Panel ID.

### Available Time Slots

Query available time slots for a specific calendar and date. This allows external systems to present booking availability to users before creating an appointment.

### Working Times

Retrieve working time configurations for specific calendars, defining when resources are available for bookings.

### Services

Manage the bookable services offered by the business. Services can be booked online in just a few steps: determine the service, define the date and time, make a binding appointment.

### Voucher Management

Create new vouchers with configurable properties including voucher ID/code, monetary value, currency, usage contingent (number of allowed uses), and expiration date. Vouchers can be used for discounts, gift certificates, or appointment packages.

### Company Information

Retrieve company account information associated with the eTermin account.

### Single Sign-On (SSO)

eTermin has the Single Sign On function for making login easier and more secure for employees who access the eTermin account. Contacts and tokens can also be created and managed via API.

- The SSO function is only available for eTermin Enterprise customers.

## Events

eTermin supports webhooks (referred to as "Web Push") for appointment-related events.

### Appointment Events

eTermin can send you a push notification once an appointment was created, modified, or deleted on the eTermin platform. The webhook sends a POST request to a configured URL with the following command types:

- **CREATED** — Fired when a new appointment is booked.
- **MODIFIED** — Fired when an existing appointment is changed.
- **DELETED** — Fired when an appointment is cancelled or removed.

The webhook payload includes appointment details (UID, start/end times, booking date), contact information (name, email, phone, address, birthday), calendar name, selected answers, booking language, custom fields (up to 6 additional fields), and notes.

**Configuration:**

- You can specify the handler URL in the "Configuration->Integration - API->API" tab.
- You can select whether the webhook should be passed as variables or JSON.
- Custom HTTP headers and a secret key hash can be configured for webhook security.
- In this tab you also will be able to send test notifications to your handler.
