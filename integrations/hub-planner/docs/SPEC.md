# Hub Planner API specification

## Authentication and requests

The integration uses the generated API key directly in the `Authorization` header, without a `Bearer` prefix. Generate a key in Settings > API; choose read/write rights for mutation tools. Requests use `https://api.hubplanner.com/v1`, JSON content, and JSON responses.

## Tool coverage

- Projects and resources: create, get/list, update, delete, and search. Updates use array-wrapped `PATCH` payloads with `_id`.
- Bookings: create, get/list, search, patch, delete, and bulk delete. Creation requires a resource, project or event, start, and end. Requests use `WAITING_FOR_APPROVAL` and require the resource-request extension.
- Time entries: create, get/list, search, update, and delete. Creation requires a resource, project, date, and minutes. Updates fetch and merge the entire object before `PUT`. The Timesheets extension is required.
- Events: list/get, create, update, and delete. Event IDs can be used as the project ID when scheduling bookings. Updates fetch and merge the entire object before `PUT`.
- Clients: list/get, create, update, and delete. The API supports updating the client name only. Metadata can be supplied on creation.
- Milestones and holidays: create, update, and delete. Updates fetch and merge the entire object before `PUT`.
- Vacations: create, patch, and delete with approval details. The Vacation extension is required. Approved or rejected vacations require the approving resource ID and approval date.
- Booking categories: list/get and optional category-group discovery. Custom groups require the Booking Category Groups extension.

## Pagination and output

List and search calls accept zero-based `page` and `limit`, with a maximum of 1000. Bookings and time entries return 20 records by default. Continue paging until fewer than the requested limit are returned. Returned objects retain stable entity and relationship IDs. Provider nulls in optional scalar fields are omitted to preserve the existing output types.

No suitable current-user or account endpoint is documented in the provider API; no identity tool is inferred from resource records.

## Official references

- [API, authentication, pagination and limits](https://github.com/hubplanner/API/blob/master/README.md)
- [Projects](https://github.com/hubplanner/API/blob/master/Sections/project.md)
- [Resources](https://github.com/hubplanner/API/blob/master/Sections/resource.md)
- [Bookings](https://github.com/hubplanner/API/blob/master/Sections/bookings.md)
- [Timesheets](https://github.com/hubplanner/API/blob/master/Sections/timesheets.md)
- [Events](https://github.com/hubplanner/API/blob/master/Sections/events.md)
- [Clients](https://github.com/hubplanner/API/blob/master/Sections/clients.md)
- [Milestones](https://github.com/hubplanner/API/blob/master/Sections/milestones.md)
- [Holidays](https://github.com/hubplanner/API/blob/master/Sections/holidays.md)
- [Vacations](https://github.com/hubplanner/API/blob/master/Sections/vacation.md)
- [Booking categories](https://github.com/hubplanner/API/blob/master/Sections/booking-categories.md)
