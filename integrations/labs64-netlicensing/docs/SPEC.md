Now let me fetch the notifications page to understand webhook support better:Now I have all the information needed. Let me compile the specification.

# Slates Specification for Labs64 NetLicensing

## Overview

Labs64 NetLicensing is a Licensing-as-a-Service (LaaS) platform that enables software vendors to manage and enforce software licenses for their products. It provides an integrated and scalable platform for software vendors and developers who want to concentrate on their product's core functionality instead of developing their own license management software. It offers a choice of ready-to-use licensing models or supports customized licensing models to suit unique business needs.

## Authentication

NetLicensing supports two authentication methods:

### Basic Authentication

NetLicensing supports HTTP Basic authentication (via SSL) using the vendor's username and password. Client applications must set the HTTP Authorization header to: `Basic <base64_encoded_username_password>`, using UTF-8 encoding. Unauthorized access returns HTTP status code 403.

**Base URL:** `https://go.netlicensing.io/core/v2/rest/`

### API Key Identification

NetLicensing supports API key identification to allow limited API access on the vendor's behalf. API keys are used via Basic authentication where the username is the literal string `apiKey` and the password is the actual API key value.

Example:

```
curl -X POST --user apiKey:<YOUR_API_KEY> https://go.netlicensing.io/core/v2/rest/licensee/123/validate
```

API keys can be created via the NetLicensing Management Console or via the Token Services API (using `tokenType=APIKEY`).

Each API key has an associated role that determines the level of access:

| Role                   | Description                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Licensee** (default) | Minimum access: licensee validate, transfer, and create shop tokens. Intended for keys embedded in client software. |
| **Analytics**          | Read-only access to all entities plus validation. Intended for ERP/CRM integrations.                                |
| **Operation**          | Full CRUD for licensees and licenses, but cannot modify product configuration.                                      |
| **Maintenance**        | Full product maintenance including products, modules, and license templates.                                        |
| **Admin**              | Full access, equivalent to username/password authentication.                                                        |

## Features

### Product Configuration Management

Create and manage products, product modules, and license templates that define your licensing structure. A product usually corresponds to an actual vendor product, and licensing rules are defined per product independently. Products comprise one or more modules, each licensed using a specific licensing model. License templates define concrete items available for licensees to obtain, specifying type, price, and quantity, and actual licenses are created from these templates.

### Licensing Models

Licensing models combine different parameters that define how a product can be used. Multiple licensing models can be assigned to a product to create composite licensing. Supported models include:

- **Try & Buy**: Evaluation period followed by purchase requirement.
- **Subscription**: Time-limited access with renewal options, including auto-renewal.
- **Pricing Table**: Manage pricing plans and membership tiers.
- **Multi-Feature**: Enable/disable product features based on user needs.
- **Pay-per-Use**: Usage-based billing (time, count, or volume).
- **Quota**: Define capacity limits for product features.
- **Node-Locked**: Restrict license to specific machines.
- **Floating**: Concurrent session-based licensing with a maximum number of simultaneous users.
- **Rental**: Multiple independent subscriptions for entity instances.

### Licensee (Customer) Management

Licensees represent end customers and must have a unique identifier. From the vendor's perspective, a licensee may correspond to a product instance, a customer account, or a hardware device. You can create, update, list, and delete licensees via the API.

### License Validation

With a single API request, your software receives the complete licensing information for a specified customer, already processed and formatted for direct use in business logic. Validation checks all active licenses for a licensee against the configured licensing models and returns the licensing state per product module.

- Custom properties can be passed during validation requests.
- Validation responses can be cryptographically signed to prevent tampering.

### License Management

Create, update, list, and delete individual licenses assigned to licensees. Licenses are created from license templates and always belong to a specific licensee. They are processed by licensing models during validation.

- Licenses support custom properties.
- Licenses can be transferred between licensees (source licensee must be marked for transfer).

### License Bundles

Bundles store license templates for different product modules belonging to the same product. Obtaining a bundle creates licenses from the bundled templates for a licensee in a single operation. Bundles have configurable pricing and currency.

### Token Management

Tokens serve multiple purposes including generating shop URLs for licensees and creating API keys. Shop tokens generate URLs in the format `https://go.netlicensing.io/shop/v2/?shoptoken={token}`. Token expiration time is configurable.

### Transaction Tracking

A transaction is created each time licenses are obtained by a licensee—whether through direct purchase via the shop, vendor assignment, or implicit assignment by a licensing model. All these events are reflected in transactions.

### NetLicensing Shop Integration

NetLicensing provides an integrated shop for a seamless online purchase experience aligned with deployed licensing models. PayPal and Stripe integrations allow customers to pay in their preferred currency. Shop tokens are created via the API and used to direct customers to a personalized purchase page.

### Backup and Restore

Vendors can save the entire product configuration as a downloadable/uploadable file for recovery and migration of settings.

### Reporting

A business intelligence module consolidates product usage information in regular reports. Customized reporting output is available in CSV format.

## Events

NetLicensing supports webhook-based notifications that send HTTP POST requests to a configured HTTPS endpoint when specific events occur.

### Customer Created

Triggered when a new licensee (customer) is created. The payload includes the licensee's number, name, active status, and associated products.

### License Created

Triggered when a new license is issued. The payload includes license details such as number, price, currency, associated licensee, license template, and model-specific properties (e.g., time volume, start date).

### Payment Transaction Processed

Triggered when a NetLicensing Shop transaction status changes. The payload includes transaction details such as number, status, price, currency, payment method (e.g., Stripe, PayPal), VAT information, and associated licenses.

### Warning Level Changed

Triggered when a customer's warning level changes (e.g., from GREEN to YELLOW or RED). Warning levels reflect the licensing compliance state across product modules. The payload includes the licensee details, updated warning level summary per module, and the current validation state of each product module.

**Configuration:** Notifications are managed via the Management Console under "Settings / Notifications." Each notification requires a name, one or more event triggers, a webhook endpoint URL (HTTPS with a valid SSL/TLS certificate), and a customizable JSON payload template using variable placeholders.
