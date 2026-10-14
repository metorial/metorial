# <img src="logo.png" height="20"> Route 4 Me

Optimize delivery and pickup routes by solving vehicle routing and traveling salesman problems. Create, manage, and resequence routes with configurable constraints including time windows, vehicle capacity, and travel mode. Import and manage customer orders, geocode addresses, track GPS device locations in real-time, and manage fleet vehicles. Maintain an address book of contacts and destinations, define avoidance zones and service territories, and attach notes and proof-of-delivery media to stops. Monitor routing activity via an auditable activity feed with webhook notifications for route changes, driver arrivals, geofence events, and team member updates.

## Account and route editing

Use `get_current_user` to discover the member ID, role, contact details, and read-only status associated with your API key. The profile lookup uses Route4Me's [current member endpoint](https://integrate.route4me.com/reference/get-member-information).

For `update_route`, choose one edit type per call: update route properties, resequence stops, add addresses, or remove a destination. Route name, member assignment, and vehicle assignment can be updated together. `duplicate_route` returns the new route ID for follow-up calls.

API keys are available under Settings > Organization Settings > Integrations > API Key; see [Route4Me's API key guide](https://support.route4me.com/retrieving-your-route4me-api-key/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
