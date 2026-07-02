That page redirected to a different site. Let me fetch the actual EchtPost API documentation.Now I have enough information to write the specification. Note: many of the EasyPost results are for a different company (EasyPost, a shipping API). The relevant results are about EchtPost, the German postcard service.

# Slates Specification for Echtpost

## Overview

EchtPost is a German online platform that enables businesses to send real, physical postcards programmatically. The EchtPost Postcards API allows you to programmatically send real, physical postcards. EchtPost offers online postcard sending services tailored for businesses, allowing them to design personalized postcards to effectively reach their target audience. The company provides various services including individual postcard creation, automated mailing for special occasions, and postcard marketing campaigns.

## Authentication

EchtPost uses API key authentication. EchtPost Postcards uses API keys for authentication.

- **API Key**: The API key is created within your EchtPost account under Account Settings (gear icon, top right) and then under "API-Schlüssel zum Datenaustausch" (API key for data exchange).
- **Base URL**: `https://api.echtpost.de/v1/`
- **Passing the key**: The API key is passed as a query parameter named `apikey`. For example: `https://api.echtpost.de/v1/contacts?apikey=your-echtpost-api-key`
- Requests use JSON (`Content-Type: application/json`).

## Features

### Postcard Creation and Scheduling

Create and schedule postcards for physical delivery. A prerequisite for sending postcards via the EchtPost API is that you have created a template within your EchtPost account in addition to having an API key.

- **Template-based**: Postcards are created using a `template_id` referencing a pre-designed template in the EchtPost web interface. Due to varying character limits depending on the font, it is not possible to create a postcard with individually customized text via the API. The text and design must be defined in the template beforehand.
- **Scheduling**: A `deliver_at` date parameter controls when the postcard is sent.
- **Notifications**: Optional email notifications can be configured with `notification_type` (either `before_send` or `after_send`), `notification_date`, and `notification_email`.
- **Recipients**: Recipients can be specified inline using `contacts_attributes` (with fields like `title`, `company_name`, `first`, `name`, `street`, `zip`, `city`, `country_code`) or by referencing an existing contact or group.
- **Group sending**: You can pass the ID of an EchtPost recipient group using `group_id`.
- If the available balance in your account is not sufficient, the API responds with 402 Payment Required. A prepaid account balance is required.

### Contact Management

Manage recipient contacts within EchtPost. Creates a new contact within the EchtPost app. Contacts can be listed and created via the API at the `/v1/contacts` endpoint. Contacts include address details such as company name, first name, last name, street, ZIP code, city, and country code.

### Template Management

You can show all postcard templates available, list templates for specific purposes, and get preview links for templates. Templates are created via the EchtPost web interface and referenced by ID in API calls. A template for your postcard is created by starting to write a postcard in the web interface.

## Events

The provider does not support events. There is no documented webhook or event subscription mechanism in the EchtPost API. Notifications about postcard sending are limited to optional email notifications configured per postcard.
