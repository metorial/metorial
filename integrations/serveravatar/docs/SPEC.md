# ServerAvatar Integration Specification

The integration uses an API access key with bearer authorization against `https://api.serveravatar.com`. API access must be enabled in the ServerAvatar account. Most resources belong to an organization; `organizationId` can be provided per invocation or through the optional default configuration.

## Tools

- Organizations: list organizations and retrieve a selected organization.
- Provisioning: list connected cloud providers and available regions/sizes; create cloud servers.
- Servers: list or retrieve servers, inspect usage/services/logs/summary, restart or destroy servers, update general/security settings, and control services.
- Applications: list or retrieve applications, create applications with custom/one-click/Git installation settings, delete applications, inspect application logs and SFTP credentials.
- Security and data: manage domains, SSL certificates, databases, firewall rules, cron jobs, and system users; list backups.
- Configuration discovery: list timezone identifiers and display labels.

## Request Contracts

Application creation sends new-user credentials as a nested JSON `systemUserInfo` object. Required domain and system-user fields depend on `tempDomain` and `systemUser`. Framework-specific options remain available through `frameworkSettings`, and explicitly named inputs take precedence.

Cloud server creation preserves provider-specific fields. Hetzner `sizeSlug` is accepted as a string in tool input and sent as a numeric server type ID. Lightsail needs `availabilityZone`, Linode needs `linodeRootPassword`, and a custom SSH key needs `publicKey`.

Cron creation uses `schedule` for preset schedules. `customScheduling` accepts a five-field cron expression in standard minute/hour/day-of-month/month/day-of-week order and sends `schedule: custom` plus the provider's separate scheduling fields.

System-user listing accepts both the documented paginated `systemUsers.data` response and existing unpaginated response shapes. API and validation failures provide actionable error messages.

## Documentation

- [API introduction and authentication](https://serveravatar.com/api-docs/)
- [Organization list](https://serveravatar.com/api-docs/endpoint/organization/)
- [Organization details](https://serveravatar.com/api-docs/endpoint/organization/show.html)
- [Server creation](https://serveravatar.com/api-docs/endpoint/server/create.html)
- [Server general/security settings](https://serveravatar.com/api-docs/endpoint/server/update.html)
- [Application creation and timezone discovery](https://serveravatar.com/api-docs/endpoint/application/create.html)
- [Cron creation](https://serveravatar.com/api-docs/endpoint/cronjob/create.html)
- [Database creation](https://serveravatar.com/api-docs/endpoint/database/create.html)
- [Application-user list](https://serveravatar.com/api-docs/endpoint/application-user/)
- [Server services](https://serveravatar.com/api-docs/endpoint/server/services.html)
