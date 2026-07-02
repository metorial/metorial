# <img src="https://provider-logos.metorial-cdn.com/fly-io.png" height="20"> Fly Io

Provision and manage applications, virtual machines (Machines), persistent storage volumes, secrets, certificates, and networking on the Fly.io cloud platform. Create and deploy containerized workloads to specific geographic regions using fast-launching Firecracker microVMs. Control the full Machine lifecycle—create, start, stop, restart, clone, update, and destroy VMs with configurable CPU, memory, and GPU resources. Manage persistent volumes, allocate IP addresses (Anycast IPv4/IPv6), configure SSL/TLS certificates for custom domains, and set app-level secrets. Query Prometheus-compatible metrics for monitoring HTTP responses, CPU, memory, disk I/O, and network traffic. Generate OIDC tokens for external service authentication.

## Tools

### Control Machine

Start, stop, restart, or suspend a Fly Machine. Also supports cordoning (disabling request routing) and uncordoning (re-enabling request routing).

### Create App

Create a new Fly App in an organization. Apps serve as named collections that group Machines, volumes, networking, and secrets. Optionally isolate the app on its own private network.

### Create Machine

Create a new Fly Machine from a container image in a specific region. Configure CPU, memory, GPU resources, networking services, environment variables, volume mounts, and more.

### Create Volume

Create a new persistent storage volume for a Fly App. Volumes provide local persistent storage that can be attached to one Machine at a time. Optionally restore from a snapshot.

### Delete App

Delete a Fly App and all its associated resources. Use force to stop all running Machines before deletion.

### Delete Machine

Permanently destroy a Fly Machine. Use force to stop a running machine before deletion. This action cannot be undone.

### Get App

Retrieve details for a specific Fly App including its status and organization. Use this to check an app's current state before performing operations on it.

### Get Machine

Retrieve full details of a specific Fly Machine including its configuration, state, events, and image reference.

### List Apps

List all Fly Apps in an organization. Returns app names, machine counts, volume counts, and network configuration for each app.

### List Machines

List all Fly Machines in an app. Optionally filter by region or metadata. Returns machine IDs, states, regions, and configuration details.

### List Volumes

List all persistent storage volumes for a Fly App. Returns volume IDs, sizes, states, regions, and attachment information.

### Manage Certificates

List, request, check, or delete SSL/TLS certificates for custom domains on a Fly App. Supports both automatic ACME (Let

### Manage Machine Lease

Acquire, check, or release an exclusive modification lease on a Fly Machine. Leases prevent concurrent updates to the same machine. Use "acquire" before updating, and "release" when done.

### Manage Machine Metadata

Get, set, or delete metadata key-value pairs on a Fly Machine. Metadata can be used for tagging, filtering, and internal routing purposes.

### Manage Secrets

List, set, or delete app-level secrets. Secrets are encrypted at rest and exposed as environment variables to Machines at boot time. Setting secrets does not immediately affect running Machines; they pick up changes on next launch.

### Manage Volume

Get details, update settings, extend size, or delete a Fly Volume. Also supports listing and creating snapshots for a volume.

### Request OIDC Token

Request an OpenID Connect (OIDC) JWT token for a Machine. This enables Fly Machines to authenticate with external third-party services that accept OIDC tokens.

### Update Machine

Update a Fly Machine's configuration. Requires the full config object (partial updates are not supported). The machine's region and name are immutable.

### Wait for Machine State

Block until a Fly Machine reaches a specific state. Useful for orchestrating machine lifecycle operations where you need to wait for a transition to complete.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
