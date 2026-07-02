# Slates Specification for Pilvio

## Overview

Pilvio is an API-first cloud infrastructure platform based in Estonia, operated by Astrec Data OÜ. It provides virtual machines (Linux and Windows), S3-compatible object storage (StorageVault), block storage, private networking, floating IPs, firewalls, and network load balancers. Resources are billed on a pay-as-you-go hourly model.

## Authentication

Pilvio uses API tokens for authentication. Tokens can be generated from the Pilvio web interface at `https://app.pilvio.com/`. The API token must be included in all requests as an HTTP header:

```
apikey: YOUR_API_TOKEN
```

Tokens can also be created, listed, updated, and deleted programmatically via the API. When creating a token, you can optionally:

- Provide a `description` for identification purposes.
- Set `restricted` to `true` to limit the token to a specific billing account (via `billing_account_id`). Restricted tokens do not require passing `billing_account_id` on resource-creation calls.

The API base URL is `https://api.pilvio.com/v1/`. Pilvio supports multiple datacenter locations; to target a specific location, include its slug after the version number (e.g., `https://api.pilvio.com/v1/{location_slug}/...`). Without a slug, the default location is used.

No OAuth2 or other authentication methods are documented.

## Features

### Virtual Machine Management

Create, list, start, stop, modify, clone, reinstall, and delete virtual machines. VMs can be configured with a chosen OS image (or a custom empty disk for manual OS installation), vCPU count, RAM, disk size, SSH public keys, and cloud-init user data. VMs can be placed into specific resource pools (e.g., "General" or "Performance" server classes) and assigned to specific private networks.

- vCPU and RAM can only be changed while the VM is stopped.
- A VM can be created from an existing snapshot or backup.
- VMs can be booted from rescue or custom ISO media for one-time boot sessions.

### Block Storage

Create, list, modify, attach, detach, and delete standalone block storage disks independently of VMs. Disks can be initialized as empty, from an OS base image, from an existing disk, or from a snapshot. Disks can be attached to and detached from VMs dynamically.

- Disk size can only be increased, not decreased.
- Deleting a disk also deletes all its snapshots.

### Snapshots and Backups

Create point-in-time snapshots (replicas) of VM storage, list them, restore a VM from a snapshot, or delete snapshots. Automatic weekly backups can be toggled per VM.

- Automatic backups keep up to 4 weekly copies.

### Object Storage (StorageVault)

Manage S3-compatible object storage buckets: create, list, get info, modify billing, and delete buckets. Manage S3 access credentials (generate, list, and delete access/secret key pairs). Bucket contents are accessed via the standard S3 API at the S3 endpoint URL provided by the platform.

- Bucket names must be globally unique.
- Only empty buckets can be deleted via the management API.

### Private Networking

Create and manage private networks for isolating VMs. Each user has a default network; additional networks can be created. VMs can be placed into specific networks during creation.

- A network can only be deleted if it contains no resources and is not the default.

### Floating IPs

Create, list, assign, un-assign, update, and delete floating (public) IPv4 addresses. Floating IPs can be assigned to VMs or other resources such as load balancers.

### Firewalls

Create and manage firewall rule sets with inbound/outbound rules specifying protocol, port ranges, and IP prefix filtering. Firewalls can be assigned to or unassigned from individual VMs.

- Rules support TCP, UDP, and ICMP protocols.
- Endpoint filtering supports "any" or specific IP prefixes (CIDR notation).

### Network Load Balancers

Create and manage layer-4 (TCP) network load balancers within a private network. Configure forwarding rules (source/target port mappings) and add/remove VM targets. Load balancers can optionally reserve a public IP.

- Supports session persistence (source IP) and connection limit settings.

### SSH Key Management

Store, list, rename, and delete SSH public keys associated with the user account. Keys can be referenced when creating VMs.

### Billing and Payments

Manage billing accounts, view resource usage and costs, list and pay invoices, manage credit cards, buy credit, configure recurring payments, and view pricing policies. Resources can be reassigned between billing accounts.

### User Profile

View and update the authenticated user's profile information (name, phone number, personal ID number).

### Platform Configuration

List available datacenter locations, OS images (plain and app catalog), bootable ISO media, and VM creation parameter constraints (allowed OS versions, resource limits).

## Events

The provider does not support events. The Pilvio API documentation does not describe any webhook, event subscription, or purpose-built polling mechanism for receiving notifications about resource state changes.
