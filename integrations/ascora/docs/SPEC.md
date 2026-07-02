# Slates Specification for Ascora

## Overview

Ascora is a cloud-based field service management and job management platform built for trade businesses (plumbing, electrical, HVAC, etc.). It manages the entire job process from enquiry, through to quote, job and invoice. It provides features such as historical customer records, job detailing, part inventory logging, asset tracking, quoting and estimating, plus the ability to electronically capture signatures or payments.

## Authentication

Ascora supports two authentication methods depending on the API being used:

### API Key Authentication (General API / Enquiry API)

It's possible to pass data into Ascora via an API. The initial steps are to enable the Ascora API and generate an API key. The API can be enabled or disabled under **Administration → API Settings**.

- Click on **Generate New API Key** and copy the API Key value.
- You can have one active API key at a time. If you generate a new one, you will need to reauthorize any connected applications.
- The API key must be included in the HTTP request header with the header name `Auth`.
- Base URL: `https://api.ascora.com.au/`

### Basic Authentication (Accounting API)

Connection to the Ascora Accounting API is achieved utilising **Basic Authentication** with an Ascora Account. This must be added to the headers in the HTTP Get/Post operations.

This uses standard HTTP Basic Auth with Ascora account credentials (username and password).

## Features

### Enquiry Submission

Enquiries from external systems (such as a website) can be created directly in Ascora, which can then be converted to Quotes or Jobs. It works by submitting enquiry details including contact information, address, description, and custom fields.

- Supports custom fields as key-value pairs for capturing additional data specific to your business.
- Can be integrated with web forms (e.g., WordPress Contact Form 7) to automatically create enquiries in Ascora.

### Customer Management

The API allows pulling customer details from Ascora. Customers can be retrieved and managed programmatically.

### Quotation and Inventory Data

The API supports pulling quotation details, inventory details, enquiries, and customer details from external systems.

### Accounting Integration (Invoices)

Invoice details can be retrieved up to a specified date. Once the invoices are processed successfully, the MarkInvoice function allows the calling system to record that the specified invoices have been successfully pushed to the Accounting System.

- Retrieve invoices that have not yet been marked as sent to the accounting system.
- Invoice data includes full header details (customer info, addresses, amounts, tax) and line items.
- Invoices must be marked as successfully pushed once retrieved or they will be retrieved again in future requests.

### Accounting Integration (Payments)

Payments can be retrieved and processed then marked as sent to the accounting system.

- Only payments linked to invoices already marked as sent to accounts are returned.
- Payments must also be marked as successfully pushed after processing to avoid re-retrieval.

### Accounting Package Integrations

Third party integration with QuickBooks, Xero and MYOB seamlessly sends invoices and data to existing accounting packages. These are built-in integrations configured through the Ascora administration interface rather than through the API directly.

## Events

The provider does not support events. There is no documented webhook or event subscription mechanism in the Ascora API. Ascora's accounting API uses a pull-based model where invoices and payments must be retrieved and then explicitly marked as processed.
