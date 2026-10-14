# ScheduleOnce integration specification

ScheduleOnce is OnceHub's Classic booking-page scheduling product. This integration also reads OnceHub Booking Calendars through the shared v2 API.

## Authentication

Create an API key in Account Integrations > APIs & Webhooks. OnceHub displays the key once when it is generated. Requests send it in the `API-Key` header over HTTPS. The connection profile and `who_am_i` use `GET /test`, whose validation message identifies the account. The account email is returned when the provider includes it in that message; it is not a user ID.

## Available tools

- `list_bookings`: filter appointments by time, status, owner, Classic booking page or event type, or booking calendar.
- `get_booking`: retrieve meeting and guest details, cancellation information, relationship IDs, and optionally expanded related objects.
- `list_booking_calendars`, `list_booking_pages`, `list_event_types`, `list_users`, and `list_teams`: discover scheduling resources and their identifiers.
- `who_am_i`: validate the connected API key and identify the account.
- `cancel_booking`: cancel a booking with an optional reason and email preference.
- `get_available_time_slots`: find calendar availability and supported meeting locations in a UTC interval of at most 30 days.

## Response compatibility

Existing tool keys and output field types remain available. List `count` describes the number of returned records, because the provider does not return a total. `hasMore` and `nextCursor` expose pagination state. Pass `nextCursor` as `cursor` on the next request.

Classic booking-page `active` maps to the existing `published` boolean. User display names combine `first_name` and `last_name`. Booking resource references retain their IDs when expanded. The provider's single cancellation object is represented as a one-entry `cancelRescheduleInformation` array. Custom-field `value` stays text; structured values are JSON text and `valueData` retains the original value.

## Provider references

- [ScheduleOnce Booking Pages API](https://help.oncehub.com/scheduleonce/developers/api/)
- [OnceHub Booking Calendars API](https://help.oncehub.com/developers/api/)
- [Authentication](https://help.oncehub.com/developers/overview/authentication/)
- [Pagination](https://help.oncehub.com/developers/overview/pagination/)
- [Expanding responses](https://help.oncehub.com/developers/overview/expanding-responses/)
