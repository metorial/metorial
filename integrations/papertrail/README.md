# <img src="https://provider-logos.metorial-cdn.com/papertrail.png" height="20"> Papertrail

Search, manage, and archive centralized logs from applications, servers, and cloud platforms. Search log events with Boolean queries and attribute filters, live-tail logs in real time, manage systems (log senders) and groups, create and manage saved searches with alerting, download hourly log archives, manage log destinations, invite and manage team members, and retrieve account usage information. Receive webhook notifications when saved search alerts are triggered by matching or missing log events.

## Tools

### Get Account Usage

Retrieve Papertrail account information and usage data, including the account name, plan details, and log volume consumed.

### List Archives

List all available log archive files. Archives are hourly gzipped TSV files containing permanent log records. Returns download URLs for each archive.

### List Log Destinations

List all log destinations configured in Papertrail. Log destinations define where systems should send their logs. Destinations can accept logs via syslog (TCP/UDP/TLS) or HTTPS.

### List Groups

List all groups in Papertrail. Groups are sets of systems (log senders) that can be searched together. Each group includes its member systems and optional wildcard pattern for automatic system matching.

### List Saved Searches

List all saved searches in Papertrail. Saved searches are named queries associated with a group that serve as the basis for setting up alerts.

### List Systems

List all systems (log senders) registered in Papertrail. Returns each system's name, hostname, IP address, last event timestamp, and syslog connection details. Useful for identifying active senders and those that have stopped logging.

### List Users

List all team members on the Papertrail account. Returns each user's ID and email address.

### Search Log Events

Search for log events across systems and groups. Supports Papertrail's full query syntax including Boolean operators (AND, OR), negation, quoted phrases, and attribute filters like \

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
