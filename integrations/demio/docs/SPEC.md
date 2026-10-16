# Demio Integration Specification

Demio provides a public webinar API for event discovery, registration, session details, and participant reporting.

## Authentication

Connect with an API key and API secret from Account Settings > API. Every request sends the `Api-Key` and `Api-Secret` headers to `https://my.demio.com/api/v1`. Connection setup verifies these credentials using `GET /ping`.

## Tools

| Tool | API operation | Behavior |
| --- | --- | --- |
| `check_connection` | `GET /ping` | Verify API access and expose the sandbox indicator when provided. |
| `list_events` | `GET /events` | List every event with its nearest representative session, optionally filtering upcoming, past, or automated events. Expose session ID, timestamp, timezone, and registration URL. |
| `get_event` | `GET /event/{id}` | Retrieve event details and all sessions. Optionally request only active sessions in a series. |
| `get_event_session` | `GET /event/{id}/date/{date_id}` | Retrieve one session's schedule and status. |
| `register_participant` | `PUT /event/register` | Register a person by event ID or registration reference URL and return their unique join link. An event ID can target a specific session; otherwise Demio uses the nearest active session. |
| `get_participants` | `GET /report/{date_id}/participants` | Retrieve a session's participants, attendance flags, statuses, and registration fields. Apply status filtering through Demio. |

Use `list_events` to discover event IDs and representative session IDs. Use `get_event` to discover the complete session list before registration or reporting. Participant query filters are `attended`, `did-not-attend`, `completed`, `left-early`, and `banned`. Spaced aliases `did not attend` and `left early` are accepted and converted to the query spelling; participant response statuses retain Demio's spaces.

Registration form fields can be supplied through `customFields` using each field's Unique Identifier. Event targeting, full name, and email use their dedicated inputs.

In `get_event`, an on-demand session has no fixed schedule. Its normalized time fields are omitted, while `eventDates[].raw` preserves Demio's explicit null values. The separate `get_event_session` endpoint reports that same session as running with a current-time timestamp; its formatted datetime still comes from the stored date and need not describe the same instant.

## Limits and Scope

Demio documents a limit of 180 requests per endpoint per minute and daily account limits of 100 API calls for trials or 5,000 for paying customers. This integration does not automatically retry registration requests.

The public API reference does not document account identity, event creation/update/deletion, file exports, or webhook registration endpoints. No tools or triggers are advertised for those operations. Join links and registration URLs are provider links, not generated files.

## Official Documentation

- [Current Public Demio API](https://api-docs.demio.com/)
- [Current official OpenAPI specification](https://api-docs.demio.com/openapi.yaml)
- [API limitations and custom field identifiers](https://help.demio.com/en/articles/4544025-api-limitations)
- [Session participant reporting](https://help.demio.com/en/articles/13676999-how-can-i-retrieve-participants-from-a-session-in-demio-using-the-api)
