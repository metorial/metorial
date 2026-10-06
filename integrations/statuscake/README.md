# <img src="logo.png" height="20"> Statuscake

Monitor website uptime, page speed, SSL certificates, and heartbeat checks. Create, read, update, and delete uptime checks supporting HTTP, TCP, DNS, SMTP, SSH, and PING protocols with configurable check intervals, regions, and alert thresholds. Manage page speed checks to measure load performance with historical statistics. Monitor SSL certificate validity, expiration, cipher strength, and mixed content. Configure heartbeat checks for cron jobs and background tasks. Manage contact groups for alert routing via email, SMS, and webhooks. Create maintenance windows to suppress alerts during scheduled periods. Retrieve monitoring server locations for firewall whitelisting.

Authenticate with an account API bearer token. Collection results include pagination metadata and a next-page number. Histories use before/after time cursors and expose continuation links. Empty arrays explicitly clear tags, contacts and other supported lists. Page-speed size thresholds use KB; SSL creation requires a three-value alert schedule. Maintenance times are interpreted in the selected timezone, ignoring any offset in the input timestamp. Contact-group notification endpoints receive HTTP GET requests.

Uptime, page-speed, SSL and heartbeat resources consume account monitoring slots; enable them and attach recipients only when intended. No automatic event subscriptions are provided. The current API has no suitable current-user identity endpoint.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
