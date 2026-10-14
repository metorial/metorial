# Sauce Labs Integration

## Authentication

Use HTTP Basic Authentication with your Sauce Labs username and access key. Select the account data center during authentication: US West (`us-west-1`), US East (`us-east-4`), Europe (`eu-central-1`), or Asia South (`asia-south-2`). Regional product availability and account permissions determine which APIs can be called.

The selected region is saved with the credentials. Existing connections continue to use the region previously stored in their connection settings. User profiles are resolved by exact username from the organization user directory; authenticated service accounts without a matching user profile retain their username as their connection identity.

## Available tools

- Jobs: `list_jobs`, `get_job`, `update_job`, `stop_job`, and `delete_job` support VDC and RDC jobs. Visibility and custom metadata updates apply only to VDC. RDC timestamps are normalized to Unix seconds, and durations are expressed in seconds.
- Builds: `list_builds` and `get_build` retrieve build status, job counts, and optional job listings. Time filters accept ISO 8601 strings or Unix seconds; returned build timestamps are ISO 8601 strings. Builds sort alphabetically by name.
- Devices: `list_devices`, `get_device`, and `get_device_status` expose device specifications, automation capabilities, and availability. Status filters are applied to the returned device catalog; device-name expressions are validated locally.
- Tunnels: `list_tunnels`, `get_tunnel`, and `stop_tunnel` inspect and manage Sauce Connect. Shared tunnel listings retain the owning username, which can be passed to `get_tunnel`. Tunnel details can optionally include the running job count.
- Account information: `get_current_user`, `list_users`, `list_teams`, and `get_user_concurrency` expose user IDs, team membership, and resource usage. The current-user tool requires an organization user profile.
- Platform information: `get_platform_status` and `list_supported_platforms` inspect platform health and supported test environments.
- App storage: `list_storage_files` lists uploaded application files and metadata.

## Official API references

- [API access and authentication](https://docs.saucelabs.com/dev/api/)
- [Virtual device jobs](https://docs.saucelabs.com/dev/api/jobs/)
- [Real device APIs](https://docs.saucelabs.com/dev/api/rdc/)
- [Builds](https://docs.saucelabs.com/dev/api/builds/)
- [Account management](https://docs.saucelabs.com/dev/api/accounts/)
- [Sauce Connect](https://docs.saucelabs.com/dev/api/connect/)
- [App storage](https://docs.saucelabs.com/dev/api/storage/)
