# CalendarHero Integration

Connect to the CalendarHero REST API using an API token from
[account API settings](https://app.calendarhero.com/settings/user#API). Requests
use `https://api.calendarhero.com` and send the token directly in the
`Authorization` header.

## Supported workflows

- Read the connected account profile.
- List meeting types, create a meeting type, or delete an existing type.
- List scheduled meetings between a start and end date.
- Create meeting requests, list requests by state or meeting type, cancel
  requests, and send reminders.
- Create, search, retrieve, update, and delete contacts; read the contact count.

## Meeting request inputs

A request needs a subject and at least one invitee. Invitees can be supplied
as email contacts or existing contact IDs discovered with `search_contacts`.
The API receives email invitees as `contactEmails` and existing contacts as
`contacts: [{id}]`. Location names are sent as `locations: [{name}]`.

`dateStart` and `dateEnd` include both a date range and daily availability
hours: the dates select the range, and the time components select the start
and end time on each day. Optional fields include duration, meeting type,
agenda, locations, and meeting room capacity. A capacity of zero means no
meeting room is booked. Use `list_meeting_types` to discover meeting types.

## Contact inputs

Contact creation requires at least one email address. Contact updates retain
existing email addresses when an update omits them, because the provider
requires an email array in update requests. Other editable fields include
name, title, organization, telephone numbers, and preferred email.

Contact search accepts an email, domain, or name query. Provider filters are
`popular`, `recent`, or a lowercase initial letter from `a` through `z`; these
filters cannot be combined with search. The compatibility value `A-Z` sorts
the returned contacts alphabetically and can be combined with search.
`all` includes duplicate contacts, while `includeTeams` includes matching teams.

## API references

- [API reference](https://api.calendarhero.com/documentation)
- [Swagger definition](https://api.calendarhero.com/swagger.json)
- [Automation and API help](https://docs.businessapp.io/calendarhero/integrations/automation/)

The published API defines request fields but leaves most response schemas
unspecified. Full responses are retained where exposed by the tools. Live
provider behavior must be verified with an authenticated account.
