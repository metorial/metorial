Now let me fetch the actual API documentation to understand the available resources/features:Let me get the OpenAPI spec or the actual API docs page to see the full resource list:Now I have enough information to write the specification.

# Slates Specification for Rentman

## Overview

Rentman is a cloud-based rental management platform designed for the AV and event production industry. It helps users schedule resources, track inventory, and create professional quotes. It offers two core products — Equipment (for scheduling equipment, managing repairs/inspections, and tracking items via serial numbers, QR codes, and RFID) and Crew (for scheduling crew, sending invites, and tracking worked hours).

## Authentication

Rentman uses **API token** (Bearer token) authentication. To use the Rentman API you must generate an API token. The API Token is personalized and used for authentication — just like a password.

**How to obtain an API token:**

1. Go to Configuration > Account > Integrations. If deactivated, click "Connect" in the 'API' field. Click "Show token". You can now use this token to build your API integrations.
2. The API token is available for 10 years. This change applies only to newly created tokens. After 10 years, you need to regenerate it.

**Usage:**

Include the token as a Bearer token in the `Authorization` header of each request. The base URL is `https://api.rentman.net`.

Example:

```
Authorization: Bearer <your-api-token>
```

The access to each API call is determined by the role of the user who generated the API token. This means the token inherits the permissions of the Rentman user account that created it.

## Features

### Project Management

Create and manage rental projects, including subprojects within a project. The API allows sending project requests to Rentman from any source. Integrate your tools to send project details to your Rentman workspace and transform these into projects. When sending project information to Rentman, it shows up as a request. Projects can contain subprojects, equipment groups, crew assignments, vehicle assignments, and cost items. Project statuses and types are configurable.

### Contact & CRM Management

Manage contacts and contact persons. You can add or update a contact in Rentman every time you create a new one in your CRM system — or the other way around. Contacts can have linked images and contact persons.

### Equipment & Inventory

Manage your equipment database including items, kits, cases, and set contents. Track equipment availability, serial numbers, stock locations, and stock movements. Equipment can be organized into folders. Repairs and inspections can be tracked for individual serial numbers.

### Crew Management

Manage crew members, their availability, rates, and rate factors. Assign crew to projects via project crew assignments. Track time registrations and time registration activities for crew members.

### Financial Documents

Manage quotes, contracts, and invoices. Transfer data from projects, invoices, and contacts into another software system. Invoices include line items and support payment tracking fields such as payment dates and payment reminders. Ledger accounts are available for financial categorization.

### Subrentals

Manage subrental jobs when you need to rent equipment from external suppliers to fill shortages. Subrentals include their own equipment groups and equipment line items.

### Scheduling & Transport

Plan vehicles for projects via project vehicle assignments. Manage appointments and appointment crew assignments.

### File Management

Files can be organised into folders, similar to a file system or Google Drive–style structure. Files can be attached to various item types such as projects or equipment items.

## Events

Rentman supports webhooks that act as push notifications for every event in your account — whether it's a new project being added, a contact being edited, or a serial number being deleted. When any of these events occur, Rentman will post a payload to the URL you've set. This payload contains details about the added, modified, or deleted entity, along with hints on how to retrieve more information from the Public API.

Webhooks are configured in the Rentman Configuration module under Integrations > Webhooks, where you specify a target URL and receive a secret token for payload verification (HMAC-SHA512 digest).

Webhooks fire for **create**, **update**, and **delete** event types across the following item categories:

- **Projects & Planning:** Project, Subproject, ProjectRequest, ProjectRequestEquipment, ProjectType, Status, Appointment, AppointmentCrew
- **Equipment:** Equipment, EquipmentSetContent, ProjectEquipment, ProjectEquipmentGroup, SerialNumber, StockMovement, StockLocation, Accessory
- **Crew & HR:** Crew, ProjectCrew, CrewAvailability, CrewRate, CrewRateFactor, TimeRegistration, TimeRegistrationActivity, ProjectFunction, ProjectFunctionGroup
- **Contacts:** Contact, ContactPerson
- **Financial:** Invoice (Factuur), InvoiceLine, Quotation, Contract, ProjectCost, Ledger, TaxClass
- **Subrentals:** Subrental, SubrentalEquipmentGroup, SubrentalEquipment
- **Transport:** ProjectVehicle, Vehicle
- **Files:** File, Folder
- **Repairs:** Repair

Each webhook payload includes the account name, the user who triggered the change, the event type (create/update/delete), the item type, item IDs with API references, and parent references where applicable.

**Considerations:**

- The order of webhook deliveries might not always reflect the exact sequence of events as they occurred in Rentman.
- In rare cases, multiple webhooks may be delivered for the same event.
- Webhooks cannot be filtered by item type — all events for all item types are sent to the configured URL.
