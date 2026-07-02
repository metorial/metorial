# <img src="https://provider-logos.metorial-cdn.com/acuity-scheduling.png" height="20"> Acuity Scheduling

Create, retrieve, update, cancel, and reschedule appointments. Manage availability by querying open dates and time slots for appointment types and calendars. Block time slots to prevent bookings. Manage client records including creation, retrieval, updates, and deletion. List appointment types, add-ons, calendars, and intake forms. Create and validate gift certificates, packages, and coupons. Retrieve orders and product listings. Subscribe to webhooks for appointment and order events.

## Tools

### Cancel Appointment

Cancel a scheduled appointment. Optionally include a cancellation note and suppress the cancellation email notification.

### Check Availability

Check available dates for a given month or available time slots for a specific date. Provide a **month** to get available dates, or a **date** to get specific time slots. Both require an appointment type ID.

### Create Appointment

Book a new appointment. Requires the appointment datetime, appointment type, and client details. Optionally provide a calendar, custom intake form field values, add-ons, and coupon/certificate codes.

### Get Account Info

Retrieve information about the authenticated Acuity Scheduling account, including the account owner name, email, and timezone.

### Get Appointment Payments

Retrieve payment information for a specific appointment.

### Get Appointment

Retrieve full details of a specific appointment by ID, including client info, intake form responses, and payment status.

### List Appointment Types

Retrieve all configured appointment types (service offerings) including their duration, pricing, and associated calendars. Also returns available add-ons.

### List Appointments

Retrieve a list of scheduled appointments. Filter by date range, calendar, appointment type, client name, email, or phone. Returns up to 100 appointments per request.

### List Calendars

Retrieve all calendars (staff members or locations) configured in the account. Use calendar IDs when creating appointments or checking availability.

### List Intake Forms

Retrieve all intake form definitions configured for the account. Forms are associated with appointment types and collect custom information from clients during booking. Use field IDs when creating or updating appointments with custom field values.

### List Labels

Retrieve all labels used for categorizing and organizing appointments.

### List Products

Retrieve all products and packages available in the online store.

### Create Time Block

Block off a time range on a specific calendar to prevent appointment scheduling during that period.

### Create Certificate

Create a certificate code for a package or coupon. Provide either a product ID (for packages) or a coupon ID (for coupons). Optionally specify a custom certificate code and assign it to an email.

### List Clients

Search and retrieve client records. Filter by name, email, or phone number, or use a general search query.

### Reschedule Appointment

Reschedule an existing appointment to a new date and time. Optionally change the calendar. The new datetime must be an available slot.

### Update Appointment

Update an existing appointment's client details, notes, or intake form field values. To change the appointment time, use the Reschedule Appointment tool instead.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
