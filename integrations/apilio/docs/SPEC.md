# Apilio Integration

## Official API

[Apilio's REST API reference](https://documenter.getpostman.com/view/13480928/TzCHAVD2)
is linked from the [provider website](https://www.apilio.com/). Requests use
`https://api.apilio.com/api/v1` over HTTPS. The collection's saved request
examples use a local development host; the collection overview specifies the
production host above.

## Authentication

Copy the preformatted Basic authentication key from your Apilio profile. The
integration accepts the encoded key with or without its `Basic` prefix and
sends it in the Authorization header. These API credentials differ from the
web application's login credentials. No OAuth flow or connection configuration
is required.

The documented API limit is 60 requests per minute. After reaching it, the
reference instructs clients to wait five minutes. API access may depend on the
account's plan.

## Tools

- List boolean, string, and numeric variables; read a variable by UUID and type.
- Set or toggle boolean values, set or clear strings, and set/add/subtract
  numeric values. Toggle and arithmetic read the current value before updating;
  concurrent writes can race with these operations.
- List all conditions or filter by variable, time, or Tuya condition type.
  Lists expose names and UUIDs; read one condition to obtain its current state.
- Read condition details by UUID. Supplying the condition type selects its
  documented detail endpoint directly. When omitted, the integration discovers
  the type from the three documented condition lists before reading details.
- List logicblocks and their last evaluation result, trigger evaluation with
  POST, or activate/deactivate an existing logicblock with PATCH.

Provider UUIDs are returned as the existing `variableId`, `conditionId`, and
`logicblockId` fields. Numeric values returned as decimal strings are converted
to numbers. The API examples omit creation timestamps, so `createdAt` is
optional. Condition lists omit evaluation state, and the active-state update
response omits the last evaluation result; those outputs are optional only
where the relevant endpoint does not return them.

## Boundaries

The documented API controls existing resources. Resource creation and deletion,
a profile/identity endpoint, pagination, file downloads, and event subscription
registration are not documented in this reference. Outgoing webhook actions
configured in Apilio are separate from subscribable API events.
