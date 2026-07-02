# <img src="https://provider-logos.metorial-cdn.com/cloudflare.png" height="20"> Cloudflare

Manage internet infrastructure including DNS records, domains, and zone settings. Deploy and configure serverless Workers scripts, R2 object storage buckets, and Pages deployments. Configure security rules including WAF, firewall rules, rate limiting, DDoS protection, and IP access controls. Manage SSL/TLS certificates, load balancers, origin pools, and health monitors. Upload and deliver video content via Cloudflare Stream. Access traffic, DNS, and security analytics via GraphQL. Configure Zero Trust Access applications, Gateway policies, and Tunnel connections. Set up alerting and webhook notifications for security events, health checks, certificate status, and usage thresholds. Register and manage domains, account members, roles, and API tokens.

## Tools

### List DNS Records

Retrieve DNS records for a Cloudflare zone. Filter by record type, name, or content to find specific records. Returns all record types including A, AAAA, CNAME, MX, TXT, NS, and more.

### List Workers

List all Workers scripts deployed on the account. Returns script names, modification dates, and usage model for each Worker.

### List Zones

List all domains (zones) on the Cloudflare account. Optionally filter by domain name or status. Returns zone details including ID, name, status, nameservers, and plan information.

### Manage Account

View account details, list account members and roles, add or remove members, and view audit logs. Manage team access to your Cloudflare account.

### Manage DNS Record

Create, update, or delete a DNS record in a Cloudflare zone. Supports all record types including A, AAAA, CNAME, MX, TXT, NS, SRV, and more. Use **action** to specify the operation.

### Manage Domain Registrations

List, get details, or update domain registrations managed through Cloudflare Registrar. View registration status, update auto-renew, lock, and privacy settings.

### Manage Firewall Rules

List, create, or delete firewall rules and IP access rules for a zone. Firewall rules use Cloudflare's expression language to match requests and apply actions like block, challenge, or allow.

### Manage Workers KV

Manage Workers KV (Key-Value) storage. List namespaces, create or delete namespaces, and read/write/delete key-value pairs within a namespace.

### Manage Load Balancers

List, create, get, or delete load balancers for a zone. Also manage origin pools and health monitors at the account level. Load balancers distribute traffic across origin servers.

### Manage Notifications

List, create, or delete notification policies and webhook destinations. Notification policies define what events trigger alerts and how they are delivered. View notification history to see past alerts.

### Manage Pages Projects

List, get details, or manage Cloudflare Pages projects and their deployments. View deployment history, rollback to a previous deployment, or delete deployments and projects.

### Manage R2 Buckets

List, create, get details, or delete R2 object storage buckets. R2 is Cloudflare's S3-compatible object storage with zero egress fees.

### Manage SSL/TLS Certificates

View and manage SSL/TLS certificates for a zone. List certificate packs, custom certificates, and Origin CA certificates. Update the zone's SSL/TLS encryption mode. Create or revoke Origin CA certificates.

### Manage Stream Videos

List, view, or delete Cloudflare Stream videos. Also manage live inputs for live streaming. Stream provides video encoding, storage, and delivery at the edge.

### Manage Worker Routes

List, create, or delete Worker routes for a zone. Worker routes map URL patterns to Workers scripts, determining which requests are handled by which Worker.

### Manage Zone

Create or delete a domain (zone) on Cloudflare, or retrieve detailed zone information. When creating a zone, Cloudflare will attempt to automatically import existing DNS records.

### Purge Cache

Purge cached content for a Cloudflare zone. Supports purging everything, specific URLs, cache tags, or hostnames. Use this to force Cloudflare to re-fetch content from the origin server.

### Query Analytics

Query Cloudflare's GraphQL Analytics API for traffic, DNS, firewall, and performance data. Supports flexible GraphQL queries to retrieve analytics for zones and accounts.

### Update Zone Settings

Get or update zone-level settings such as SSL/TLS mode, security level, caching, minification, development mode, and more. Can retrieve all current settings or update a specific one.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
