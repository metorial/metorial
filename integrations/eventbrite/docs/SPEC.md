# Eventbrite integration

Connect with a personal OAuth token or the OAuth authorization-code flow. API requests use bearer authorization over HTTPS. Start with `get_user` to discover the current profile and organization IDs; organization-scoped tools accept an ID directly or use the optional default organization setting.

## Tools

- `get_user`: profile and paginated organization discovery.
- `get_event`, `list_events`, `create_event`, `update_event`: event details and organization event management.
- `publish_event`: publish or unpublish, subject to Eventbrite's event, ticket, payment, order, and payout requirements.
- `manage_event`: cancel or permanently delete an eligible event; a series parent operation affects its occurrences.
- `get_event_description`: full rendered HTML descriptions, including events whose event object contains only a summary.
- `manage_ticket_class`: list, retrieve, create, update, or delete ticket classes. A paid ticket price uses an ISO currency code and minor-unit amount, for example `USD,1000`. Tiered events require an inventory tier ID for ticket writes.
- `list_orders`, `get_order`: organization or event order lists and individual order details.
- `list_attendees`, `get_attendee`: attendee profile, ticket, order, and check-in information.
- `manage_venue`: retrieve, list, create, or update venues.
- `manage_organizer`: retrieve or create organizer profiles.
- `manage_discount`: list, retrieve, create, update, or delete discount codes. List requires a provider scope, or an event ID for the event scope. Fixed and percentage discounts are mutually exclusive. Discount activation dates are event-local datetimes.

List results expose continuation tokens. Pass the previous token into the next request while keeping filters unchanged. A continuation token takes precedence over a page number.

The integration does not expose global public event search, ticket purchasing, check-in mutations, webhooks, or structured-content editing.

## References

- [Eventbrite API reference](https://www.eventbrite.com/platform/new/api)
- [Official Python SDK](https://github.com/eventbrite/eventbrite-sdk-python)
- [Official Ruby organizer model](https://github.com/eventbrite/eventbrite-sdk-ruby/blob/master/lib/eventbrite_sdk/organizer.rb)
