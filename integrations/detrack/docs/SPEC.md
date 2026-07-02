Now let me fetch the V2 API docs to get more details on features:Now I have enough information to compile the specification. Let me also check the V2 API base URL and authentication header format:

# Slates Specification for Detrack

## Overview

Detrack is a cloud-based delivery management platform that provides real-time vehicle tracking, electronic proof of delivery (ePOD), route optimization, and job management for logistics operations. It enables businesses to create and manage delivery and collection jobs, track drivers, capture signatures and photos as proof of delivery, and send automated customer notifications.

## Authentication

Detrack uses API key-based authentication. The API key allows sending and retrieval of information from your Detrack account through the API for integrating with other systems.

**Generating an API Key:**

Log in to your Detrack account. In the left sidebar, click **Integrations > API Key**. Click **Generate New Key**. Copy the API key value shown and store it in a safe place.

**Using the API Key (V2 API):**

You can set your API key in a custom HTTP header and your request in a JSON body. Set the HTTP header `Content-Type` to `application/json`. Set the custom HTTP header `X-API-KEY` with your Detrack API key.

The V2 API base URL is: `https://app.detrack.com/api/v2/`

**Sub-user API Keys:**

Avoid sharing your owner API key with customers for integration. For customers, it is recommended to create a separate sub-user account and generate the respective sub-user API Key.

## Features

### Job Management

The API enables performing common tasks such as adding, editing, and deleting deliveries without manual data entry or human intervention. Jobs are the core resource in Detrack and can represent either deliveries or collections. Each job requires a `date`, `do_number` (delivery order number), and `address`.

- Jobs support both **Delivery** and **Collection** types.
- Jobs include fields for tracking numbers, order numbers, customer details, address information, scheduling (date, time windows), and job sequences.
- Items can be added to jobs with SKU, quantity, and description attributes. Items appear in Electronic Proof of Deliveries (POD).
- Jobs can be searched by various criteria including driver/vehicle, job status, customer, and creation time period.

### Vehicle / Driver Management

Vehicles can be created, retrieved, updated, and deleted. Vehicles have three key identifiers: `name` (the driver name), `detrack_id` (unique to the driver), and `id` (unique to the driver-organization pairing).

- Vehicle records include GPS location, speed, battery level, distance traveled, and connection status.
- Vehicles can be assigned to jobs for delivery/collection tracking.

### Proof of Delivery

The platform captures proof of delivery via the driver app, including digital signatures, photos, and timestamps as soon as jobs are completed.

- Signature image files, up to 10 photo files, and POD PDF files can be downloaded via the API.

### Route Optimization

The Routing API enables users to export optimized routes back into their ERP system, closing the loop and creating efficiencies for organizations that need to complete further actions within their own systems.

- Routes can be created and saved without linking a driver. Route details including Run Number, ETA, and job sequence are sent to the Job Table.

### Job Status Tracking

Jobs contain a milestones array that serves as a log of events. Milestones include: Info Received (when job is created), Heading to delivery/pick up (when driver triggers heading to), and status changes like dispatched, completed, and failed.

- Statuses include: info_received, scheduled, dispatched, head_to_delivery, head_to_pick_up, arrived, picked_up, completed, partially_completed, failed, and return.

## Events

Detrack supports webhook push notifications. Webhook PUSH notifications are HTTP callbacks — Detrack POSTs a notification to a specified Webhook URL whenever there is a status update for a job.

### Job Status Updates

You enter a Webhook URL for receiving PUSH notifications. You may select the required triggers (based on job status) to push information to the designated URL.

Available trigger statuses include:

- **Info Received** — triggered when new jobs are added or imported to Detrack.
- **Scheduled** — triggered when the tracking status changes to Scheduled.
- **Heading To** — triggered when a driver is on the way, includes an estimated arrival time (ETA).
- **Arrived** — triggered when the driver has arrived at the job destination.
- **Completed** — triggered when a job is completed and proof of delivery is captured.
- **Partially Completed** — triggered when a job is partially completed.
- **Failed** — triggered when a job has failed.

### Driver Assignment Changes

You may enable the sending of a webhook for change of driver assignment. This works independently of the trigger status — the system will send two separate webhook notifications if both conditions are fulfilled.

### Configuration Options

- Webhooks can be separated into Delivery and Collection jobs with different Webhook URLs configured under Settings > Delivery or Collection.
- Basic Auth can be selected for Webhook Auth Type, with Username and Password fields.
- Custom headers can be added with Name and Value pairs.
