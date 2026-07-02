Now let me get the full scopes list and check for any App Platform webhook delivery features:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for DigitalOcean

## Overview

DigitalOcean is a cloud infrastructure provider offering virtual machines (Droplets), managed Kubernetes, managed databases, object storage (Spaces), App Platform (PaaS), serverless functions, networking, and monitoring services. The DigitalOcean API lets you programmatically manage Droplets and other DigitalOcean resources using conventional HTTP requests. All of the functionality available in the DigitalOcean control panel is also available through the API.

## Authentication

DigitalOcean supports two authentication methods:

### 1. Personal Access Tokens (API Keys)

To use the DigitalOcean API, you generate a personal access token. Personal access tokens function like ordinary OAuth access tokens. You use them to authenticate to the API by including one in a bearer-type Authorization header with your request.

Tokens are created in the DigitalOcean control panel under **API > Personal access tokens**. When creating a token, you configure:

- **Token name**: A label for your reference.
- **Expiration**: Choose when the token expires. After the interval passes, the token can no longer authenticate you to the API.
- **Scopes**: Three scope modes are available:
  - **Full Access** grants the token all scopes available based on the permissions of your team role.
  - **Read Only** grants the token read scope for all resources available based on the permissions of your team role.
  - **Custom Scopes** lets you select specific scopes from the full list of scopes available to you based on your team role.

You cannot edit the scope of a token after creation.

Usage: Include the token as `Authorization: Bearer <token>` in HTTP requests.

### 2. OAuth 2.0

The DigitalOcean OAuth API lets you obtain limited access to DigitalOcean teams by delegating authentication to DigitalOcean. It supports the authorization code flow meant for web applications running on a server. It also supports the implicit authorization flow, useful for client-side applications such as mobile or desktop clients where the client secret should not be stored on the user's device.

**Endpoints:**

- Authorization: `https://cloud.digitalocean.com/v1/oauth/authorize`
- Token exchange: `https://cloud.digitalocean.com/v1/oauth/token`
- Token refresh: `https://cloud.digitalocean.com/v1/oauth/refresh`
- Token revocation: `https://cloud.digitalocean.com/v1/oauth/revoke`

**Setup:**
Register your application to use OAuth via the DigitalOcean control panel. Registering an application assigns it a client ID and client secret which you then use in API calls to the DigitalOcean authorization server.

**OAuth Scopes:** You can optionally set the scope of token that you are requesting (e.g. `scope=read write` for full access). For the OAuth flow, scopes are `read` and/or `write`.

**Token Lifecycle:** The token is available to use until the token expires (30 days after being issued) or is otherwise invalidated. Each access token comes with a refresh token. You can use a refresh token exactly once to create a new access token (and refresh token). Doing so invalidates the access token that the refresh token was issued with.

### Spaces API Authentication

Spaces provides a RESTful XML API for programmatically managing the data you store. The API is interoperable with Amazon's AWS S3 API, allowing you to interact with the service with any S3-compatible tools. Spaces uses separate access keys (Access Key ID and Secret Access Key) generated in the control panel, authenticated via AWS Signature Version 4.

## Features

### Droplet (Virtual Machine) Management

Create, resize, rebuild, reboot, power on/off, and destroy Linux-based virtual machines. You can use the API to create, destroy, and retrieve information about your Droplets. You can also use the API to enable backups, change kernels, or reboot your Droplets. Supports selecting from shared or dedicated CPU plans, choosing regions, images, and SSH keys. Droplets can be organized using tags.

### Kubernetes

Create and manage managed Kubernetes clusters, including node pools, cluster upgrades, and credential management. Supports downloading kubeconfig files for cluster access.

### App Platform

App Platform is a fully managed Platform-as-a-Service (PaaS) that deploys applications from Git repositories or container images. It automatically builds, deploys, and scales components while handling all underlying infrastructure. Manage apps, deployments, components, domains, and alert policies via the API.

### Managed Databases

Provision and manage database clusters for MySQL, PostgreSQL, MongoDB, Valkey, OpenSearch, and Kafka. Manage users, databases, connection pools, firewall rules (trusted sources), read replicas, and backups.

### Spaces Object Storage

Spaces Object Storage is an S3-compatible service for storing and serving large amounts of data. Manage buckets, objects, CORS configurations, and access keys. Includes a built-in CDN. Uses a separate S3-compatible API with its own access key authentication.

### Block Storage

Create and manage persistent block storage volumes that can be attached to Droplets. Supports creating snapshots of volumes.

### Networking

- **Domains & DNS**: Manage domains and DNS records through the DigitalOcean DNS interface.
- **Load Balancers**: Create and configure load balancers to distribute traffic across Droplets.
- **VPCs**: Create and manage Virtual Private Clouds for network isolation.
- **VPC Peering**: Connect VPCs across regions.
- **Reserved IPs**: Allocate and assign static IP addresses to Droplets.
- **Firewalls**: Create and manage cloud firewalls with inbound/outbound rules applied to Droplets or tags.

### Container Registry

Easily store, manage, and protect private container images. Manage repositories, tags, and garbage collection within a registry.

### Serverless Functions

Create and manage serverless function namespaces and triggers. Deploy functions that execute on demand without managing server infrastructure.

### Monitoring & Uptime

DigitalOcean Monitoring is a free, opt-in service that lets you track Droplet resource usage in real time, visualize performance metrics, and receive alerts via email or Slack. Create alert policies for CPU, memory, disk, and bandwidth metrics on Droplets and load balancers.

DigitalOcean Uptime is a monitoring service that checks the health of any URL or IP address. Use Uptime to monitor the latency, uptime, and SSL certificates of any website or host.

### Images & Snapshots

Manage custom images, Droplet snapshots, and volume snapshots. Import custom images, transfer images between regions, and create Droplets from snapshots.

### SSH Key Management

Upload, list, update, and delete SSH public keys associated with your account for use when creating Droplets.

### Projects

Organize and group related resources (Droplets, Spaces, databases, etc.) into projects for easier management.

### Tags

Create and manage tags that can be applied to resources for bulk operations and organization.

### Billing

View account balance, billing history, and invoices.

### Generative AI (Gradient)

Create and manage generative AI tools and agents on the DigitalOcean Gradient AI Platform, including serverless inference endpoints.

## Events

Webhooks are not available as a destination for the monitoring service. DigitalOcean does not provide a general-purpose webhook or event subscription system through its API. Monitoring and Uptime alerts are limited to email and Slack notifications only. There is no native mechanism to subscribe to resource lifecycle events (e.g., Droplet creation, deletion) via webhooks or push-based event delivery.

The provider does not support events.
