# Slates Specification for Saucelabs

## Overview

Sauce Labs is a cloud-based testing platform that provides infrastructure for automated and manual testing of web and mobile applications. It allows users to run tests on more than 700 different browser, operating system, and device combinations, including real devices, emulators, and simulators. The platform also offers API testing, visual testing, performance testing, and secure tunnel proxying for testing applications behind firewalls.

## Authentication

Sauce Labs uses **HTTP Basic Authentication** for its REST API.

Authentication is performed via HTTP Basic Auth. Provide your username as the basic username and your API key as the password. All requests must use HTTPS. Calls made over HTTP or without proper authentication will fail.

**Credentials required:**

- **Username**: Your Sauce Labs username (available under User Settings)
- **Access Key**: The Sauce Labs API uses API keys to authenticate requests. You can view and manage your API key under your Sauce Labs User Settings.

Alternatively, you can use the username and access key of a service account to authenticate API requests. Service account credentials are generated during account creation.

**Usage examples:**

Inline credentials:

```
curl -u "$SAUCE_USERNAME:$SAUCE_ACCESS_KEY" https://api.us-west-1.saucelabs.com/rest/v1/...
```

**Data Center Selection (required):**

Each endpoint is formed by a {base-url} prefix which depends on the data center associated with your Sauce Labs account. The API base URLs are:

- **US West**: `https://api.us-west-1.saucelabs.com`
- **US East**: `https://api.us-east-4.saucelabs.com`
- **EU Central**: `https://api.eu-central-1.saucelabs.com`

The URL hostname and authorization credentials for APIs are different for each data center, and can be found in Sauce Labs on the User Settings page.

## Features

### Test Job Management

The Jobs API methods allow you to review and edit the metadata associated with the tests you are running on Sauce Labs. You can also stop tests, delete jobs, and filter lists of jobs by a variety of attributes, such as owner, time period, build, or environment.

- Jobs include metadata such as browser, OS, status, video/screenshot URLs, tags, and custom data.
- Supports both Virtual Device Cloud (VDC) and Real Device Cloud (RDC) jobs, which use separate endpoints.

### Build Management

Builds are a means of categorizing your jobs on Sauce Labs, allowing you to view related jobs together for greater insight. The Builds API methods retrieve information about the builds and the jobs assigned to them.

- Builds are exclusive to the device source on which the jobs were run, meaning you cannot group real device tests and emulator/simulator tests in the same build.
- Filter builds and their associated jobs by status, time period, and other attributes.

### Real Device Cloud Management

The Real Device Cloud (RDC) API allows you to manage real devices and jobs in your data center.

- List available real devices with their OS/browser combinations and identifying information.
- View device availability and status.
- Manage private devices and their settings.
- Start, stop, and delete real device test jobs (Appium, Espresso, XCUITest).

### Account and Team Management

- Create new users in your Sauce Labs organization.
- Query and manage teams, including viewing team members, settings, and concurrency allocations.
- Retrieve and regenerate user access keys.
- Activate/deactivate users and assign team admin roles.

### Sauce Connect Proxy Tunnels

Use the Sauce Connect API methods to monitor and clean up your active proxy tunnels.

- List active tunnels for a user, including shared tunnels.
- Get tunnel details and the number of jobs using a specific tunnel.
- Shut down tunnels programmatically.

### Platform Information

The Platform APIs provide insight into the current state of the Sauce Labs platform in order to either validate your calls in advance or troubleshoot unexpected results.

- Check platform availability and operational status.
- List all supported OS/browser/device combinations available for testing.

### App Storage and Distribution

Upload APKs or IPAs directly to Sauce Labs Mobile App Distribution.

- Upload mobile app binaries with release notes, tags, tester group assignments, and symbol files.
- Manage projects and builds for distributed apps.
- Manage testers and tester groups: add, remove, block, unblock testers.
- Invite tester groups to specific builds.
- Retrieve user feedback and crash reports from test sessions.

### API Testing

These API endpoints allow you to interact with Sauce Labs API Testing functionality. You can execute tests, view analytics, retrieve project information, and more.

- Upload, run, and manage API tests within projects.
- Execute tests individually, by tag, or run all tests in a project.
- Retrieve test execution events, logs, and metrics.
- Configure webhook connectors for forwarding test results to third-party services.

### Performance Testing

Retrieves the results of performance tests run by the requesting account and returns the metric values for those tests.

- Query performance metrics such as speed index, time to first paint, and page weight.
- Retrieve results for specific jobs or across all performance tests.

### Visual Testing

Sauce Visual testing consists of two main workflows: Test execution and review. Both workflows need to be implemented, but they may be performed by different people or teams.

- Generate and compare snapshots (screenshots) against baselines.
- Review and approve or reject detected visual changes.

## Events

Sauce Labs supports webhooks for receiving notifications about test and build events.

### Test Job Completion (Virtual Devices)

Virtual Device Automation | Failed tests only: Receive information about failed jobs run on Sauce Labs desktop browsers and mobile emulators and simulators. Virtual Device Automation | All tests: Receive all test result events for jobs run on Sauce Labs desktop browsers and mobile emulators and simulators.

- Can be configured to receive all test results or only failed tests.
- Webhook payloads include full job details (status, browser, OS, build, etc.).
- A header `saucelabs-sign` is added to each webhook POST request which contains the request body signed with the webhook secret. To confirm the request indeed comes from Sauce Labs, a new signature needs to be generated and compared to the received signature.

### Test Job Completion (Real Devices)

Real Device Automation | Failed tests only: Receive information about failed test events for Appium jobs run on Sauce Labs real devices. Real Device Automation | All tests: Receive all test result events for Appium jobs run on Sauce Labs real devices.

- Same filtering options (all tests or failed only) and payload structure as virtual device webhooks.

### Visual Testing Build Completed

Visual Testing | Build completed: Receive information about Visual build once it is finished and its status is available.

### Mobile App Distribution Events

Webhooks allow integration between Sauce Mobile App Distribution and your backend. Using these webhooks, you can subscribe for specific events and receive an HTTP POST request whenever such an event occurs.

- **Feedback events**: Receive notifications when users submit feedback on app builds, including text, screenshots, and session details.
- **Crash events**: Receive notifications when app crashes are detected, including device info and crash messages.
- You can configure more than one webhook, and each webhook applies to selected projects and selected events.

### API Testing Connectors

Sauce Labs also offers Webhook integrations to export data between Sauce Labs API Testing and third-party apps. Setting up an outgoing webhook connector allows Sauce Labs API Testing to send test result data to external sources.

- Configurable per project with custom URL, headers, and JSON payload templates.
- Turn the toggle to True to receive data on all events, including successes. Turn the toggle to False to receive notifications for test failures only.
