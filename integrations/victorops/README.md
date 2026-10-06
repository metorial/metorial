# VictorOps / Splunk On-Call

Manage Splunk On-Call (formerly VictorOps) incidents, teams, users, escalation policies and routing keys. Read on-call schedules, rotations, incident history and shift logs. Request immediate on-call takeovers, control maintenance mode, manage incident notes, and send or read timeline chat messages.

The integration retains its `victorops` identifier. Use an organization API ID and API key; read-only keys support only read operations.

## Tools

- `list_incidents`, `get_incident`, `create_incident`, `manage_incident`
- `manage_incident_notes`
- `get_on_call`, `create_on_call_override`, `get_team_rotations`, `get_shift_log`
- `manage_user`, `manage_team`, `manage_escalation_policy`
- `manage_routing_keys`, `delete_routing_key`, `manage_maintenance_mode`
- `search_incident_history`, `send_chat_message`, `list_chat_messages`

Incident creation and rerouting can page responders. User creation sends invitations. User-wide actions and immediate on-call takeovers affect active response duties. An empty routing-key list starts global maintenance, which persists until ended. Deleting an escalation policy also removes routing keys targeting only that policy. Chat messages and resolved incident history are retained by the provider.

Policy steps accept legacy seconds or explicit whole minutes. Notes accept text or structured JSON. Chat sending requires the registered monitoring-tool value. History and chat reads expose pagination information; organization totals are never inferred from one page.

See [the workflow specification](docs/SPEC.md) and [the official API reference](https://portal.victorops.com/public/api-docs.html).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
