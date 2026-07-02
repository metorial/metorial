Now I have enough information to write the specification. Let me compile it.

# Slates Specification for Ngrok

## Overview

Ngrok is a globally distributed gateway that provides secure connectivity for applications and services running in any environment. It offers a REST API at `https://api.ngrok.com` for programmatic management of tunnels, endpoints, domains, certificates, IP policies, credentials, and traffic policies. It functions as an API gateway, reverse proxy, and ingress platform with built-in traffic management, security, and observability features.

## Authentication

API Keys are used to authenticate to the ngrok API. You can provision your first API key from the API Keys page on the ngrok dashboard. Additional API keys can then be managed programmatically via the API itself.

**Method:** Bearer Token (API Key)

All requests to the ngrok API must include the API key in the `Authorization` header:

```
Authorization: Bearer {API_KEY}
```

The API is available at `https://api.ngrok.com` and listens only on port 443 to prevent unencrypted requests.

Requests must also include a version header:

```
Ngrok-Version: 2
```

All API access requires an API key, but you may also further restrict which IPs are permitted to make requests to the API. You may define one or more IP Policies to configure which CIDR blocks may manipulate the API for your account.

Note: The API key is separate from the **authtoken** used by ngrok agents to establish tunnel connections. Tunnel Credentials (authtokens) authorize the ngrok agent to connect to the ngrok service as your account and are installed with the `ngrok config add-authtoken` command or via the `ngrok.yml` configuration file.

## Features

### Endpoint Management

Create, list, and manage endpoints that define how traffic is routed to your services. Endpoints define what tunnel or edge is used to serve a hostport, and only active endpoints associated with a tunnel or backend are returned. Cloud endpoints can be created via the API with a URL, type, and traffic policy configuration. Supports filtering with CEL expressions.

### Domain Reservation

Reserved Domains are hostnames that you can listen for traffic on. Domains can be used to listen for http, https or tls traffic. You may use a domain that you own by creating a CNAME record specified in the returned resource, which points traffic for that domain to ngrok's edge servers. Supports automatic TLS certificate management (e.g., via Let's Encrypt) or attaching user-uploaded certificates.

### Reserved TCP Addresses

Reserved Addresses are TCP addresses that can be used to listen for traffic. TCP address hostnames and ports are assigned by ngrok, they cannot be chosen. Useful for non-HTTP services such as SSH or database connections.

### TLS Certificate Management

TLS Certificates are pairs of x509 certificates and their matching private key that can be used to terminate TLS traffic. TLS Certificates are unused until they are attached to a Domain. TLS Certificates may also be provisioned by ngrok automatically.

### IP Policies and Restrictions

Create reusable groups of CIDR ranges with allow or deny actions. IP Policies are reusable groups of CIDR ranges with an allow or deny action. These can be applied to restrict access to your API, agent connections, or endpoints.

### Tunnel and Session Management

Tunnel Sessions represent instances of ngrok agents or SSH reverse tunnel sessions that are running and connected to the ngrok service. Each tunnel session can include one or more Tunnels. Tunnels provide endpoints to access services exposed by a running ngrok agent tunnel session.

### Credential (Authtoken) Management

Tunnel Credentials are ngrok agent authtokens. They authorize the ngrok agent to connect the ngrok service as your account. You can create, list, update, and delete authtokens. ACL rules can be configured to restrict what domains, addresses, and labels the token is allowed to bind.

### API Key Management

Create, list, update, and delete API keys used to authenticate with the ngrok API. Keys can be assigned to specific users or bot users.

### Bot Users (Service Users)

Manage service accounts for programmatic access, separate from human user accounts.

### SSH Credentials and Certificates

Manage SSH public keys, SSH certificate authorities, SSH host certificates, and SSH user certificates for SSH tunnel authentication.

### Certificate Authorities

Certificate Authorities are x509 certificates used to sign other x509 certificates. Attach a Certificate Authority to the Mutual TLS module to verify that the TLS certificate presented by a client has been signed by this CA. Certificate Authorities are used only for mTLS validation.

### Event Subscriptions and Destinations

Configure log exports to capture audit and traffic events and publish them to external destinations. An event destination must contain exactly one of the following objects: kinesis, firehose, cloudwatch_logs, or s3. Azure Logs Ingestion and Datadog are also supported as destinations.

### Secrets and Vaults

Manage secrets and vaults for storing sensitive configuration data used across your ngrok resources.

## Events

Ngrok supports an event subscription system that allows you to capture and export logs to external destinations. This is not a webhook system that pushes events to arbitrary URLs; instead, you configure Event Subscriptions with Event Sources (the types of events to capture) and Event Destinations (supported third-party services where logs are delivered).

### Audit Events

ngrok emits Audit Logs when changes are made to your account like create/update/delete of Domains, API Keys, IP Policies, etc. These include events such as `api_key_created.v0`, `ip_policy_created.v0`, `ip_policy_updated.v0`, and similar events for domains, credentials, certificates, edges, and other resources. Each audit event includes a principal object identifying the user or service user who initiated the change.

### Traffic Events

When traffic transits through your endpoints, ngrok emits Traffic Logs like processing an HTTP request or TCP connection. Key event types include `http_request_complete.v0` and `tcp_connection_closed.v0`. Traffic Logs support the ability to select exactly which fields you'd like to include. They also support the ability to be filtered using a CEL expression which is evaluated against each log to determine if it should be captured.

### Supported Destinations

Event logs can be published to:

- Amazon CloudWatch Logs
- Amazon Kinesis
- Amazon Firehose (including S3 via Firehose)
- Azure Logs Ingestion
- Datadog Logs

Events are serialized as JSON. Log Sources include a version number in their name (e.g., `api_key_created.v0`). New fields may be added without a version change; any other change introduces a new version.
