Now let me get more details from the API documentation page:# Slates Specification for Remote Retrieval

## Overview

Remote Retrieval is a logistics service that manages the return and recovery of IT equipment (laptops, monitors, tablets, cell phones) from remote employees. It provides shipping boxes with prepaid labels to employees and tracks the return process end-to-end, serving IT and HR teams during offboarding, equipment upgrades, or transitions.

## Authentication

Remote Retrieval uses **API Key** authentication.

- An API key is obtained from the **Enterprise Remote Retriever portal**.
- The key must be provided in the `Authorization` header as a Bearer token:
  ```
  Authorization: Bearer <API_KEY>
  ```
- You can validate that your API key is active by calling the `GET /api/v1/validate/user` endpoint, which returns the associated email address on success.
- API access is available as part of the Enterprise package.

## Features

### Order Creation

Create equipment return orders by specifying the type of equipment, order type, employee information, and company return address.

- **Equipment types**: Laptop, Monitor, Cell Phone, Tablet.
- **Order types**: "Return To Company" or "Recycle with Data Destruction."
- **Additional services** (optional, for "Return To Company" orders only): Data destruction and return to company, or data destruction and delivery to a new employee.
- Supports creating single or multiple orders in a single request.
- Employee info includes name, email, full address, and phone number.
- Company info includes return contact name, company name, full return address, email, and phone.

### Bulk Order Creation via CSV

Create multiple orders at once by uploading a CSV file. Each row represents a single order with fields for equipment type, order type, employee details, and company information. A CSV template is available for download from the documentation.

### Order Retrieval and Tracking

Retrieve a list of all orders or get details for a specific order. Orders include:

- **Payment status**: Completed or Pending.
- **Order status**: Tracks the full lifecycle — from shipping label creation, to box shipped to employee, to box delivered to employee, to device shipped back to company, to device delivered.
- **Shipment details**: Device type, send status (box to employee), and return status (device to company).

### Company Details

Retrieve the registered company profile information, including company name, email, address, and account creation date.

### Device Pricing

Retrieve real-time pricing for all supported equipment types. Monitor sizes are categorized as standard (17–23 inches) and Monitor_27 (24–27 inches).

## Events

The provider does not support events. There are no webhooks or purpose-built polling mechanisms documented in the Remote Retrieval API.
