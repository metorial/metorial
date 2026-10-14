# SuperSaaS API specification

SuperSaaS provides online appointment scheduling for resource, service, and capacity calendars. Authentication uses the account name and the administrator API key from Account Info; requests use HTTPS with the documented account and api_key parameters. This integration does not use expiring OAuth tokens.

## Supported workflows

- Discover schedules, resources/services, user groups, configured fields, and custom form templates.
- List, retrieve, create, update, and delete users using internal IDs, usernames, or foreign keys suffixed with fk.
- List appointments by local date range, user, resource, or service; retrieve user agendas and recent changes.
- Retrieve, create, update, and delete appointments. An optional scheduleId avoids searching account schedules when reading, updating, or deleting a booking.
- Discover capacity calendar slots, including occupancy and waiting-list counts. Use a slotId to create a capacity booking, or a start time for a resource booking.
- Query availability for resource and capacity schedules, with appointment length and resource-name filters where supported. The full option includes capacity slots without remaining availability.
- Retrieve completed custom forms, and request attached form data on user lists, appointment lists, or individual appointment reads.
- List and retrieve promotion codes, duplicate a configured code, and delete a code while preserving discounts on existing bookings.

Appointment creation is not supported for service calendars. Capacity slot creation, update, and deletion are not exposed. The API key represents an account administrator; the documented API has no dedicated current-user or account-profile endpoint.

The range, agenda, changes, and availability APIs return JSON collections inside bookings or slots objects. Capacity trees are flattened to booking records while retaining slot IDs. User and booking creation may return an empty body and a Location header; the returned record includes the stable ID from that header. User updates use notfound=error to avoid implicitly creating missing users.

## Official references

- [Authentication](https://www.supersaas.com/info/dev/authentication)
- [User API](https://www.supersaas.com/info/dev/user_api)
- [Appointment and Slots API](https://www.supersaas.com/info/dev/appointment_api)
- [Information API](https://www.supersaas.com/info/dev/information_api)
- [Form API](https://www.supersaas.com/info/dev/form_api)
- [Promotion API](https://www.supersaas.com/info/dev/promotion_api)
