# Eventee integration specification

## API and authentication

The integration uses [Eventee's official Public API](https://docs.eventee.com/) and [OpenAPI specification](https://docs.eventee.com/openapi.yaml), checked on 2026-10-15. The former [Apiary reference](https://publiceventeeapi.docs.apiary.io/) now points to the new documentation.

- Base URL: `https://eventee.com/public/api/v1`.
- Authentication: `Authorization: Bearer <token>`. Generate the event token in Eventee's event settings; API access depends on the subscription plan. A new token revokes the previous token.
- A token identifies one event. There is no event ID configuration or discovery step and no documented current-user/account endpoint. Tokens are static; OAuth refresh does not apply.
- Requests time out after 30 seconds. HTTP/provider errors retain provider messages, validation details, status, and error code when supplied.
- The documented lists return complete arrays; no pagination parameters are invented.

## Tools

| Tool | API | Behavior |
| --- | --- | --- |
| `get_event_content` | GET `/content` | Complete program; optional date and empty-day filters. Discover halls, speaker, session, break and label IDs. |
| `list_participants` | GET `/participants` | Participants of all documented roles, with original role, group, tickets, personal URL, and check-in time retained in `raw`. |
| `list_registrations` | GET `/registrations` | Registrations, including status (0 pending, 1 confirmed, 2 declined), group, form answers and original profile fields in `raw`. |
| `invite_attendees` | PUT `/attendee/invite` | Maps existing profile inputs to documented provider fields; supports group and ticket assignments. |
| `create_registrations` | PUT `/registration/invite` | Pre-register people or update registrations matching their email; optional notification email. |
| `set_attendee_checkin` | PATCH `/attendee/{id}/checkin` | Check in or undo check-in, using IDs from `list_participants`. |
| `remove_attendee` | DELETE `/attendee?email=...` | Remove event participation, invitation and tickets; also succeeds if absent. |
| `remove_registration` | DELETE `/registration?email=...` | Remove a registration; also succeeds if absent. |
| `list_groups` | GET `/groups` | Discover stable group IDs, names, enabled features and default group. |
| `list_partners` | GET `/partners` | Sponsor/exhibitor details, booth information and sections. |
| `list_reviews` | GET `/reviews` | Session ratings, comments, reviewer and lecture details. |
| `manage_hall` | POST `/hall`, PATCH/DELETE `/hall/{id}` | Create/update/delete halls. Update requires name; omitting stream removes it. Deleting a hall leaves its sessions without a hall. |
| `manage_session` | POST `/lecture`, PATCH/DELETE `/lecture/{id}` | Create/replace/delete lectures (type 0) or workshops (type 1). |
| `manage_break` | POST `/pause`, PATCH/DELETE `/pause/{id}` | Create/update/delete agenda breaks. Omitted description is retained on update. |
| `manage_speaker` | POST `/speaker`, PATCH/DELETE `/speaker/{id}` | Create/partially update/delete speakers. Deleting a speaker removes their session assignments. |
| `manage_label` | POST `/label`, PATCH/DELETE `/label/{id}` | Create/update/delete session labels (tracks), including color and display order. |

## Compatibility and provider details

The four original tool keys and existing input field types/requiredness remain available. New fields are optional. Numeric IDs remain numbers and are validated as positive safe whole numbers at runtime. New display-order and capacity inputs require non-negative safe whole numbers.

Program data uses `halls`, `days`, `lectures`, `workshops`, `pauses`, `speakers`, and `tracks`; the compatibility output maps these into stages/sessions while retaining the entire response in `raw`. Nested `days[].lectures` are also included and sessions are deduplicated by ID. The program endpoint supplies no event name, description or event-level start/end metadata, so those historical fields are empty strings when absent. A speaker's full `name` remains in `raw.speakers`; first/last names are not guessed. Compatibility session `stageId` is 0 when no hall is assigned; `trackId` is the first assigned label or null, with all labels preserved in `raw`.

The participant endpoint does not supply every historical profile field. Missing fields are empty strings; originals are retained in `raw`. Email can be an anonymous/deleted-account placeholder and is therefore not constrained to valid email in read output. `checkedIn` is derived from `checked_at`.

Attendee/registration profile requests use `photo`, `bio`, `web`, `facebook_link`, `twitter_link`, `linked_in_link`, and `position`. Invitation responses contain the event `url` and `qr_code`, not a successful count. `submittedCount` reports request size; the historical numeric `invitedCount` is 0 when unconfirmed, with `invitedCountConfirmed: false`. Eventee processes the first 25 entries immediately and the rest asynchronously, and can silently skip invalid entries and event admins/moderators. Read back the participant/registration lists to verify outcomes. `sendEmail` defaults to false. Supplying tickets replaces the attendee's event tickets.

Session creation/update requires name and ordered start/end times in `YYYY-MM-DD HH:mm:ss`, in the event time zone. Updates require an existing event day and reset omitted speakers, labels, type, capacity and engagement settings; hall and stream are retained when omitted. Workshop check-in is documented only on creation. Session deletion removes its questions, polls, bookings and ratings.

## Scope and verification

No direct webhook subscription API or identity endpoint is documented. No webhook triggers are advertised. Partner creation, editing of partner detail-page sections, and the destructive whole-event test-content reset are outside this refresh's practical tool scope. Original provider URLs and file metadata remain in responses; none of these tools downloads or exports file bytes.

Verification consists of the required object-root schema regression, backward-contract inspection, scoped formatting and the package build. Provider calls, live E2E, and tool-use evals were not run in this refresh.
