Now let me look at the Pipedream integration for AppDrag to understand the full API surface:Now I have enough information to create the specification. Let me compile everything I've found.

# Slates Specification for AppDrag

## Overview

AppDrag is a cloud-based web development platform that provides a drag-and-drop website builder, cloud CMS, serverless backend (Cloud Backend), cloud database, e-commerce, blogging, and newsletter tools. It is a web development platform that enables users to create websites, blogs, e-commerce sites, email marketing campaigns, and cloud backends. The API Builder is a compute service that lets users create and run code without provisioning or managing servers, powered by AWS Lambda.

## Authentication

AppDrag uses **API Key + App ID** authentication. AppDrag uses API keys for authentication. When you connect your AppDrag account, the API Key and App ID are required. You can find your AppID and API Key in the CloudBackend Portal.

Every project created on AppDrag's Cloud Backend receives an APIKey to secure all requests to your API and Database. You can access your APIKey modal through the "API" or "Databases" dashboard. The same key is used for both.

When making API calls:

- The base URL follows the format: `https://{app_id}.appdrag.site/api/{folder}/{function}` or `https://{custom_domain}/api/{folder}/{function}`
- For functions that require authentication, the APIKey parameter must be included. Every call made to such a function will require the APIKey parameter.
- The API Key is passed as a POST form-data parameter named `APIKey`.

To initialize the SDK (for use within cloud functions):

```
cloudbackend.init('your_api_key', 'your_app_id');
```

Environment variables can also be used, where the APIKey and App ID will always match what you have on file, regardless of how often you modify the key.

## Features

### Cloud Database Management

AppDrag provides a Cloud SQL Database (100% MySQL compatible) with high availability. You can create tables, add/modify/delete rows, or use a REST API to execute SQL queries on your database. The API supports full SQL operations including SELECT, INSERT, UPDATE, and DELETE queries, as well as creating tables and adding indexes.

- Data can be imported/exported via CSV.
- Backup and restore to MySQL-compatible format is supported.

### Cloud Functions (API Builder)

Cloud API functions run on AWS Lambda technology. Functions can be written in Node.js, Python, C#, GO, Java, Ruby, and SQL. Every route can have its own settings including CPU/RAM, HTTP method, TTL, and environment variables.

- Visual SQL provides a no-code interface for basic backend communication with the database, allowing API endpoints for Select, Insert, Update, and Delete operations without code writing.
- API functions can be used as scheduled tasks, triggered automatically at a desired interval or a specific day and time.
- Functions can be exported individually or as a whole backend. Exported APIs can be imported on other projects or used on-premise.

### File Storage

The Cloud Backend includes file storage capabilities that allow uploading files, downloading remote files, creating directories, and listing directory contents within the project's storage. Files uploaded through cloud functions can be saved to the backend storage with custom destination paths.

### Transactional Email

AppDrag plans include transactional email credits that can be used to send email notifications to users or yourself instead of using an external SMTP server. Emails can be sent programmatically from cloud functions. The sender email address must be verified before sending.

### Newsletter Management

AppDrag includes built-in newsletter tools. Users can design newsletters with a drag-and-drop editor and segment audiences for personalized email engagement. Through the API, contacts can be managed (added/deleted) from newsletter lists.

### E-commerce

AppDrag offers e-commerce tools to set up and manage online stores, manage inventory, orders, and customer information from a single dashboard, and offer various payment and shipping options. Order events (new orders, status updates) are available as triggers for automation.

### Blog Management

AppDrag includes an integrated blogging platform to manage and publish blog content, manage blog posts with an editor and publishing tools, and schedule posts in advance. Blog articles can be posted programmatically via the API.

## Events

AppDrag does not provide a native webhook system or event subscription mechanism through its API. However, it does expose event triggers through third-party integration platforms (such as Zapier), which include:

- **New Form Submission** — Triggers when a form is submitted.
- **Order Status Updated** — Triggers when the status of an order is updated.
- **New Order** — Triggers when a new order is placed.

These triggers are polling-based through the Zapier integration and are not native webhook events. AppDrag does not offer built-in webhook or event subscription endpoints as part of its own API.
