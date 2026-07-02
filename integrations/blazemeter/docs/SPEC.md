# Slates Specification for Blazemeter

## Overview

BlazeMeter (by Perforce) is a continuous testing platform that provides performance testing, functional testing, API monitoring, service virtualization, and test data management. Its API enables users to create, run, and update functional and performance test configurations, retrieve test results, create and manage mock services, manage test data, and create API monitoring services. The platform is JMeter-compatible and supports running tests from the cloud with results reporting.

## Authentication

BlazeMeter uses two distinct authentication methods depending on which API area you are accessing:

### 1. API Key with Basic Authentication (Performance, Functional, Service Virtualization, Test Data APIs)

To use the BlazeMeter API, pass your BlazeMeter API key using Basic Authentication (Basic Auth) credentials.

- **Base URL:** `https://a.blazemeter.com/api/v4/`
- Select 'Basic Auth' as the authentication type. From your BlazeMeter API key, enter your `api_key_id` as the Username and `api_key_secret` as the Password.
- All API requests must be made over HTTPS. Calls made over plain HTTP will fail.

**Generating an API Key:**

- From the User menu (top-right of the screen), click Settings → API keys. Once you have created an API key, the Secret Key that is generated will not reappear after the initial view of it. If you lose this key, then you will have to regenerate the API key to get a new one.
- Give your API key a relevant name and set its expiration period.
- The account owner or admin can limit the maximum expiration date for all API keys of all users of the account.

### 2. OAuth 2.0 (API Monitoring / Runscope API)

The Runscope API uses OAuth 2.0 for authentication. OAuth2 lets applications request authorization to an API Monitoring account without getting the user's password. Access tokens can be limited to specific types of data, and can be revoked by the user at any time.

- **Base URL:** `https://api.runscope.com`
- **Authorization URL:** `https://www.runscope.com/signin/oauth/authorize`
- To use the API, you must first create an application. Applications must have a name, website URL, and callback URL. Once you create an application you'll be given a client ID and a client secret to use in the authorization flow.
- When you create the application, it automatically authorizes your own account and generates an access_token for your own use. This makes it easy to start using the API for personal use without building a web flow.
- Pass the access token in the `Authorization: Bearer <access_token>` header.

**OAuth 2.0 Scopes:**

- `api:read` — Default read access to account information including message streams and buckets.
- `message:write` — Write access to messages.

## Features

### Performance Testing

Create, update, and run performance tests, get test results, manage shared folders, schedule tests, and create private locations to run those tests. Performance tests simulate virtual users to load test websites and APIs. Supports multi-tests for combining test configurations. Tests are organized in a hierarchy of Accounts → Workspaces → Projects → Tests.

### Functional Testing (Deprecated)

Starting February 2022, the API Functional testing feature has been deprecated. Depending on your subscription plan, you may still be able to run existing tests but can no longer create new ones. Use BlazeMeter API Monitoring to create and run API Functional Tests going forward.

### API Monitoring

Create, update, and run API monitoring tests and environments, get test results, handle test schedules, and handle administration on your account. Tests are organized into "buckets" which contain tests. Each test can have multiple environments with different configurations (variables, locations, notifications). Monitor API performance from 19 different locations across the globe.

### Service Virtualization

A virtual service can stand in for the live service for testing purposes. A transaction-based virtual service is filled with a collection of transactions, typically a subset of the transactions in a service. You run a virtual service to deploy those transactions. Once a virtual service is created and running, you can associate it with your test, embed it in your test scripts, or provide it during test execution.

- Create virtual services from transactions, recordings (HAR files), Swagger/WSDL files, or templates.
- Set think time to control artificial delay between requests and responses. Configure behavior for non-matching requests — either throw an error or redirect to the live service.
- Deploy virtual services to cloud locations or private locations.
- The Service Virtualization API base URL is `https://mock.blazemeter.com/api/v1/`.

### Test Data Management

Create, update, and utilize Data Models in functional and performance tests, as well as associate Data Models with virtual services. Instead of hard-coding values, parameterize tests and replace values with dynamic test data. You can load test data from CSV files or let BlazeMeter generate it for each test run. Once a Data Entity has been defined in a workspace, you can associate it with any tests and virtual services.

- Comprised of two sub-APIs: Asset Repository API (manage assets and metadata) and Test Data API (generate/validate data models).

### Account & Workspace Administration

Handle workspace administration such as changing user roles, enabling/disabling users, etc. Manage user invitations, account settings, and workspace-level resources including dedicated IPs, private locations, and APM credentials. Each project has its own ID (projectId) which will be required for use in the APIs.

### Test Scheduling

Tests (performance, functional, and API monitoring) can be scheduled to run automatically at specified times or intervals.

### Shared Folders

Upload and manage files used across tests within a workspace, such as test scripts (JMX files), CSV data files, and other artifacts.

## Events

BlazeMeter supports webhook notifications for API Monitoring tests:

### API Monitoring Test Run Webhooks

You can specify callback URLs to be requested upon the completion of every test. From the Notifications page in the test editor enter the URL you would like to be notified at. All test runs, regardless of outcome, will trigger a webhook notification. To notify multiple URLs, enter one per line.

The webhook sends a JSON payload via POST including test ID, test name, test run ID, environment details, result (pass/fail), timestamps, region, and details of each request step with assertions.

### Advanced Webhooks (API Monitoring)

Advanced webhooks allow users to specify a URL, which BlazeMeter will use to send a JSON payload that includes the results of a test run via a POST request. That URL can be the endpoint of a 3rd-party application, or your own application built to receive results of API Monitoring test runs.

- Advanced webhooks are a team-level feature. To enable advanced webhooks for your team, contact BlazeMeter Support.
- Configured via the team's Connected Services page and enabled per environment.

### Performance Test Usage Alerts

BlazeMeter supports configuring usage alerts for performance tests that can send notifications to Slack webhook URLs or email. Configurable event triggers include: test started, test ended, test passed, test failed, and test saved. Minimum concurrency and duration thresholds can also be set.
