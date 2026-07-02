# Slates Specification for Jenkins

## Overview

Jenkins is an open-source automation server used for building, testing, and deploying software through continuous integration and continuous delivery (CI/CD) pipelines. It provides machine-consumable remote access API to its functionalities, currently offering data in three flavors: JSON, XML, and Python. Jenkins is self-hosted, meaning each instance runs at a user-specified URL.

## Authentication

Jenkins supports two primary authentication methods for API access:

### HTTP Basic Authentication with API Token (Recommended)

To make scripted clients invoke operations that require authorization, use HTTP BASIC authentication to specify the user name and the API token.

- **Required credentials**: Jenkins instance URL, username, and API token.
- Jenkins API tokens are an authentication mechanism that allows a tool to impersonate a user without providing the actual password for use with the Jenkins API or CLI.
- The API token is available in your personal configuration page. Click your name on the top right corner on every page, then click "Configure" to see your API token. The URL `$root/me/configure` is a good shortcut.
- The token is sent via the `Authorization` header using Basic auth: `Basic base64(username:apiToken)`.
- Since you can have multiple API tokens, this allows fine-grained control over which scripts, hosts, or applications are allowed to use Jenkins.
- Example: `curl -X GET http://JENKINS_URL/api/json --user username:apiToken`

### HTTP Basic Authentication with Password

Specifying the real password is still supported, but it is not recommended because the risk of revealing password, and the human tendency to reuse the same password in different places.

### CSRF Protection (Crumb)

If your Jenkins is configured with "Prevent Cross Site Request Forgery exploits" security option, then you have to send a CSRF protection token as an HTTP request header. A crumb can be obtained from the `/crumbIssuer/api/json` endpoint and must be included as a header in subsequent write requests. API tokens are preferred instead of crumbs for CSRF protection.

**Note**: Jenkins does not do any authorization negotiation, i.e. it immediately returns a 403 (Forbidden) response instead of a 401 (Unauthorized) response, so make sure to send the authentication information from the first request (preemptive authentication).

## Features

### Job Management

Create, configure, copy, enable, disable, delete, and list jobs. Creating jobs by sending XML file or by specifying params as options with more customization options including source control, notifications, etc. Job configuration is managed via XML (`config.xml`). Listing jobs available in Jenkins with job name filter, job status filter.

- Supports Freestyle jobs, Pipeline jobs, Multibranch Pipelines, and Organization Folders.
- Adding/removing downstream projects. Chaining jobs, i.e., given a list of projects each project is added as a downstream project to the previous one.

### Build Management

Building jobs (with params), stopping builds, querying details of recent builds, obtaining build params, etc.

- Trigger builds with or without parameters, including file parameters.
- Obtaining progressive console output.
- Access build information including status, duration, artifacts, and test results.
- Stop, terminate, or kill running builds.

### View Management

Creating, listing views. Adding jobs to views and removing jobs from views.

- Get and update view XML configuration.
- Views allow organizing jobs into tabbed categories on the dashboard.

### Node (Agent) Management

Adding/removing Jenkins agents, querying details of agents.

- Create, configure, enable, disable, disconnect, and delete nodes.
- Nodes are the "machines" on which build agents run. Jenkins monitors each attached node for disk space, free temp space, free swap, clock time/sync, and response time.

### Build Queue Management

Obtaining the tasks in build queue, and their age, cause, reason.

- List queued items, query individual queue items, and cancel queued builds.

### Plugin Management

Plugin manager API supports installing necessary plugins and listing current plugins.

### Credential Management

Credentials: create, exists, get config, set config, destroy, list.

- Manage credentials stored in Jenkins for use in jobs and pipelines.

### System Information

- Retrieve Jenkins server version, system information, and overall server status.
- Execute a Groovy script on the Jenkins master or on a node if specified.

### Folder Management

- Jenkins supports organizing jobs into folders. Folders can be created, configured, and deleted like other job types through the same API patterns.

## Events

Jenkins does not have a built-in, native webhook/event system out of the box. However, event functionality is available through widely-used plugins:

### Outbound Webhook for Build Events (via Notification/Outbound Webhook Plugin)

Sends HTTP POST callbacks to a configured URL when build events occur. Event has four possible values: start, success, failure, unstable.

- Configured as a post-build action on individual jobs.
- Payload includes build name, build URL, event type, project name, and build variables.

### Generic Webhook Trigger (Inbound)

By default, when enabling the webhook trigger for a job, it can be triggered by sending an event to `http://JENKINS_URL/generic-webhook-trigger/invoke`.

- Allows external systems (e.g., GitHub, GitLab, Bitbucket) to trigger Jenkins builds via HTTP POST.
- Supports token-based authentication, IP whitelisting, and HMAC validation.
- Incoming webhook payloads can be parsed using JSONPath or XPath to extract variables for the build.

### Generic Event Plugin (Outbound)

Allows users to receive events fired by the system via webhook. By using the plugin, the third-party system can receive the events it is interested in more quickly and respond quickly.

- Configure an event receiver URL in system management, and Jenkins will forward system-level events to that endpoint.
