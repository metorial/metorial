# Whautomate integration

Whautomate provides an API for customer records, omnichannel messaging, segmentation, WhatsApp broadcasts, scheduling, services, staff, and locations.

## Authentication

Generate an API key in Integrations → REST API and use the API host shown in the same screen. The documented hosts are `api.whautomate.com` (Global) and `api.in.whautomate.com` (India); the corresponding HTTPS URLs are also accepted. Requests send the key in `x-api-key`.

## Tools

- Search, create, update, and delete clients and contacts; manage their tags and retrieve a tag by ID with `get_tag`.
- Send text, media, and channel-specific templates; retrieve and search message history. Every send requires a location discovered with `list_locations`. WhatsApp accepts a client, contact, or phone recipient; the other channels require a contact ID. WhatsApp text/media messages require an active 24-hour session. Media requires a MIME type.
- Create and inspect audience segments and WhatsApp broadcasts. Segments and broadcasts require an audience type and location. Inspect broadcast delivery statistics and logs.
- Discover appointment availability, search appointments, and book, reschedule, or cancel appointments. Date ranges for availability make one request per day and are limited to 31 days. Existing appointments supply their location for rescheduling/cancellation when it is omitted.
- Search and manage classes, list/add/cancel participants, and retrieve a client's class bookings. Cancellation uses a participant booking ID; client IDs are resolved only when exactly one booking matches.
- Manage services and service categories, inspect staff and availability, block staff time, and discover locations.

## API coverage limits

Invoice APIs, account/profile identity APIs, and additional undocumented endpoints are not exposed. Invoice product functionality does not establish a public REST endpoint. Service request fields retain their existing contract because the official Services API page was unavailable during this refresh. No live account was used for verification.

## Official API references

- [REST API and authentication](https://help.whautomate.com/product-guides/whautomate-rest-api)
- [Clients](https://help.whautomate.com/product-guides/whautomate-rest-api/clients), [contacts](https://help.whautomate.com/product-guides/whautomate-rest-api/contacts), [client tags](https://help.whautomate.com/product-guides/whautomate-rest-api/client-tags), [contact tags](https://help.whautomate.com/product-guides/whautomate-rest-api/contact-tags)
- [Messages](https://help.whautomate.com/product-guides/whautomate-rest-api/messages), [segments](https://help.whautomate.com/product-guides/whautomate-rest-api/segments), [broadcasts](https://help.whautomate.com/product-guides/whautomate-rest-api/broadcasts)
- [Appointments](https://help.whautomate.com/product-guides/whautomate-rest-api/appointments), [classes](https://help.whautomate.com/product-guides/whautomate-rest-api/classes), [staff](https://help.whautomate.com/product-guides/whautomate-rest-api/staffs), [service categories](https://help.whautomate.com/product-guides/whautomate-rest-api/service-categories), [locations](https://help.whautomate.com/product-guides/whautomate-rest-api/locations)
- [API error contract](https://help.whautomate.com/product-guides/whautomate-rest-api/whautomate-rest-api-error-messages)
