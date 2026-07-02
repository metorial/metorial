# <img src="https://provider-logos.metorial-cdn.com/digital_ocean-logo.svg" height="20"> DigitalOcean

Manage cloud infrastructure on DigitalOcean. Create, resize, rebuild, and destroy Droplets (virtual machines). Provision and manage managed Kubernetes clusters, managed databases (MySQL, PostgreSQL, MongoDB, Valkey, OpenSearch, Kafka), and App Platform deployments. Create and manage block storage volumes, Spaces object storage buckets, container registries, and serverless functions. Configure networking resources including domains, DNS records, load balancers, VPCs, firewalls, and reserved IPs. Set up monitoring alert policies and uptime checks for Droplets and URLs. Manage SSH keys, images, snapshots, projects, tags, and billing information. Access generative AI inference endpoints via the Gradient AI Platform.

## Tools

### Get Account

Get your DigitalOcean account information including email, Droplet limit, billing status, and team details.

### List Droplets

List Droplets (virtual machines) in your DigitalOcean account. Optionally filter by tag name. Returns key details including status, IP addresses, region, and resource allocation.

### List Regions

List all available DigitalOcean regions. Returns region slugs, names, and available features. Use region slugs when creating Droplets, databases, and other resources.

### List Apps

List all App Platform applications. Returns app names, URLs, regions, and deployment status.

### Manage Container Registry

View your container registry, list repositories and tags, or trigger garbage collection. DigitalOcean provides a private container registry for storing Docker images.

### List Database Clusters

List all managed database clusters in your DigitalOcean account. Returns connection details, engine type, size, status, and region for each cluster. Supports filtering by tag.

### List Domains

List all domains managed in your DigitalOcean DNS. Returns the domain name and TTL for each domain.

### Create Droplet

Create a new Droplet (virtual machine) in DigitalOcean. Configure the region, size, image, SSH keys, backups, monitoring, and networking options. Use the **List Regions** and **List Sizes** tools to find valid region slugs and size slugs.

### List Kubernetes Clusters

List all managed Kubernetes clusters in your DigitalOcean account. Returns cluster details including version, endpoint, node pools, and status.

### List Alert Policies

List all monitoring alert policies. Shows CPU, memory, disk, and bandwidth alerts configured for Droplets and load balancers.

### List Certificates

List DigitalOcean-managed TLS certificates used by load balancers and CDN endpoints. Returns IDs, names, DNS names, state, and expiration information.

### List CDN Endpoints

List DigitalOcean CDN endpoints for Spaces origins. Use this to audit edge delivery configuration and find endpoint IDs.

### List Function Namespaces

List DigitalOcean Functions namespaces including labels, regions, API hosts, and IDs.

### List Function Triggers

List scheduled triggers in a DigitalOcean Functions namespace.

### List Load Balancers

List all load balancers in your DigitalOcean account. Returns configuration, health status, forwarding rules, and associated Droplets.

### List Projects

List all projects in your DigitalOcean account. Projects help organize related resources (Droplets, Spaces, databases, etc.) together.

### Manage SSH Keys

List, create, or delete SSH keys on your DigitalOcean account. SSH keys are used for secure authentication when creating Droplets.

### Manage Tags

List, create, delete tags, or tag/untag resources. Tags are labels you can apply to DigitalOcean resources for organization and bulk operations.

### List Volumes

List block storage volumes in your DigitalOcean account. Optionally filter by region or name.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
