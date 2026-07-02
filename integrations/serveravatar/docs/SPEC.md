Let me get more details on the full API endpoint categories.Now I have enough information to write the specification.

# Slates Specification for Serveravatar

## Overview

ServerAvatar is a cloud server management platform that allows users to deploy, manage, and monitor web applications (WordPress, PHP, Node.js) on VPS/cloud servers from providers like DigitalOcean, Vultr, Linode, AWS Lightsail, and Hetzner. It provides a unified dashboard for server configuration, application deployment, database management, SSL, backups, and more — essentially replacing manual Linux server administration.

## Authentication

ServerAvatar uses API keys for authentication.

By default, the API access is disabled in your Account. To enable it, log in to your ServerAvatar account, click on Account -> API Access from the left sidebar, and toggle the switch to enable API access. When you enable API access, you will get an API Access key in return.

The API key must be sent as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <YOUR API TOKEN>
```

All API requests are scoped to the authenticated user's account and must be made to the base URL `https://api.serveravatar.com`. You can renew or reset the API Access key anytime; when you disable the API access, your API Access Key is destroyed. Only one API key is active at a time.

All resources are scoped under an **organization** — most API paths include an `{organization}` path parameter representing the organization ID.

## Features

### Organization Management

Manage organizations within your ServerAvatar account. Organizations serve as the top-level container for all resources (servers, applications, etc.).

### Server Provider Integration

- Connect and manage cloud provider accounts (DigitalOcean, Vultr, Linode, AWS Lightsail, Hetzner, etc.).
- Connect a custom server via direct installation with a generated command, or provision servers directly through connected cloud providers.
- Choose web server type (Nginx, Apache2, OpenLiteSpeed), database type (MySQL, MariaDB), and Ubuntu version when creating servers.

### Server Management

- List, view, update, restart, and destroy servers.
- Monitor server installation status and resource usage (CPU, RAM, disk).
- View server logs and service statuses (Nginx, MySQL, PHP-FPM, etc.).
- Start, stop, or restart individual services on the server.
- Configure server alerts, default/disabled pages, restart schedules, SSH port, and root password.
- Manage server tags for organization.

### Security & Access Control

- Manage firewall rules on servers.
- Configure Fail2ban for brute-force protection.
- Manage basic authentication for a specified application on a server, including retrieving, creating, and disabling basic authentication.
- Change root password and configure SSH access settings.

### Application Management

- Create applications via one-click installers (WordPress, Mautic, Moodle, Joomla, Prestashop, Akaunting, Statamic, Nextcloud, phpMyAdmin, Craft CMS) or via Git and Node deployment methods.
- Configure PHP version (7.2–8.x), webroot, system user, and domain settings per application.
- Enable/disable applications, view logs and advanced logs, and manage PHP settings.
- Retrieve SFTP credentials for applications.
- One-click WordPress login (WP Login).
- Manage application tags.

### Application Domains

- Add, manage, and remove custom domains for applications.

### Git Deployment

- Deploy web applications from GitHub, GitLab, and Bitbucket directly to your server.
- Manage deployment keys, repository connections, branch selection, and auto-pull (webhook-based automatic deployment on push).
- Configure deployment scripts to run after pulls (e.g., composer install, cache clearing).
- View commit records and deployment logs.

### Node.js Application Management

- Deploy and manage Node.js applications with configurable build commands, start commands, port, package manager, process mode, and environment variables.

### Cloudflare Integration

- Manage Cloudflare settings, DNS records, SSL/TLS encryption, edge certificates, HTTPS redirect, HTTPS rewrite, TLS 1.3, and TLS version for applications connected to Cloudflare.

### SSL Certificate Management

- Install SSL certificates on applications. Updating SSL certificate is required after adding a new domain to the application.
- Supports automatic (Let's Encrypt) and custom SSL certificates.
- Enable/disable force HTTPS redirection.
- Uninstall SSL certificates.

### Backup Management

- Create fresh backups for applications and databases to connected cloud storage providers (e.g., Wasabi, S3).
- Configure automatic backup schedules and retention periods.
- Download, restore, and delete backups.
- Access archive backups from deleted servers.

### Database & Database User Management

- Create, list, and delete databases on servers.
- Create and manage database users and their permissions.

### Application User (System User) Management

- Create and manage system users on servers, which control file ownership and permissions for applications.

### File Manager

- Browse and manage files on the server through the API.

### Site Migration & Cloning

- Migrate sites between servers.
- Clone existing sites.
- Create and manage staging areas for applications.

### Cron Job Management

- Create, list, and manage cron jobs on servers.

### Disk Cleaner

- Manage disk cleanup operations on servers.

### Supervisor Process Management

- Configure and manage Supervisor processes on servers for running background workers or daemons.

### Git & Storage Provider Management

- Connect and manage Git providers (GitHub, GitLab, Bitbucket) at the account level.
- Connect and manage cloud storage providers for backups.

### White-Label (Hosting User)

- Enable a control panel access user for white-label functionality, allowing branded server control panels for reselling.

## Events

The provider does not support webhooks or event subscriptions through its API. ServerAvatar offers notification channels (Slack, Discord, Telegram, Pushover) for receiving alerts about server events, but these are push notification integrations configured through the dashboard rather than programmable webhook/event subscription endpoints in the API.
