# Apaleo Integration

Apaleo is a property management system for hotels and serviced apartments. This integration uses the documented v1 APIs for bookings, reservations, inventory, rate plans, finance, accounts, and operations.

## Authentication

Use an OAuth Connect Client with `openid`, `profile`, and `offline_access`, plus the permissions needed for the registered tools. OAuth access tokens are renewed with the refresh token, retaining the existing refresh token if Apaleo omits a replacement. A Simple Client uses client credentials and obtains a new token when its access expires.

The OAuth method requests `reservations.manage`, `setup.read`, `rateplans.read-corporate`, `folios.manage`, `invoices.read`, `invoices.manage`, `companies.manage`, `operations.trigger-night-audit`, and `operations.change-room-state`. Fine-grained clients configure API permissions and authorized properties in Apaleo. Permission and property restrictions are enforced by Apaleo.

## Supported Tools

| Workflow | Tools |
| --- | --- |
| Identify account and discover properties | `get_current_account`, `list_properties` |
| Search and retrieve bookings | `list_bookings`, `get_booking` |
| Reservation lifecycle | `list_reservations`, `get_reservation`, `create_booking`, `manage_reservation` |
| Search available rates | `search_offers` |
| Inventory and housekeeping | `list_units`, `list_unit_groups`, `change_unit_state` |
| Rate plans | `list_rate_plans` |
| Guest folios | `list_folios`, `manage_folio` |
| Invoices | `manage_invoice` |
| Corporate companies | `manage_company` |
| Room blocks | `list_blocks` |
| Daily operations | `trigger_night_audit` |

Call `list_properties` to discover property IDs. An optional default property can be configured for existing workflows. Lists return one page; use pageNumber and pageSize to retrieve subsequent pages. Apaleo supports at most 500 items per page for the documented v1 list endpoints.

## Request Details

- Booking creation requires booker, arrival, departure, adults, channelCode, and timeSlices. The integration defaults channelCode to Direct and can use the first primaryGuest as booker. `unitGroupId` validates the selected rate plans; `unitId` assigns the room after booking creation. A failed room assignment reports the created booking and reservation IDs so it can be retried.
- Reservation stay changes use the amend action; comments, travel purpose, and company linkage use JSON Patch. An omitted stay field keeps its current value. Changing dates without timeSlices matches an available offer to the existing rate plan of each overlapping time slice. Single-rate stays can extend automatically; mixed-rate stays require explicit assignments for new or ambiguous slices. The existing corporateCode input remains available, but changing an existing reservation's corporate code is unsupported by the documented amend payload and returns a clear error.
- Company creation requires code, name, propertyId, and address. canCheckOutOnAr defaults to false. Updates use JSON Patch.
- Folio charges require name, amount, serviceType, and vatType. serviceType defaults to Other; quantity defaults to 1. Custom payments and refunds require method and amount.
- Invoice creation requires folioId and languageCode; an omitted languageCode uses the current account default. Cancellation defaults reasonCode to Other. Marking an invoice paid requires paymentMethod and receipt.
- Night audit uses the operations API with the selected property ID. Room condition changes use unitsConditions with a unit ID and condition.

## Official References

- [Authorization code flow](https://apaleo.dev/guides/oauth-connection/auth-code-grant.html)
- [Refresh token flow](https://apaleo.dev/guides/oauth-connection/refresh-token.html)
- [Client credentials flow](https://apaleo.dev/guides/oauth-connection/simple-client.html)
- [API reference](https://api.apaleo.com/swagger/index.html)
- [Scopes and permissions](https://apaleo.dev/guides/api/scopes.html)
