# SuperSaaS

Manage online appointment scheduling, bookings, and calendar resources. Create, read, update, and delete appointments on schedules, including querying availability and retrieving recent changes for syncing. Manage users, sync user databases, and identify users by internal ID or foreign key. Retrieve custom form submissions, both stand-alone and attached to appointments or users. Duplicate, query, and delete promotion/coupon codes. Discover capacity slots with occupancy and waiting-list counts. List schedules, resources, services, and user groups.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>

Appointment reads, updates, and deletes accept an optional `scheduleId` from `list_schedules`. Supplying it avoids searching the account schedules for the booking. Capacity bookings use `slotId` from `list_slots`; resource bookings use `start`. Availability queries support resource and capacity schedules; service schedules do not support that endpoint.
