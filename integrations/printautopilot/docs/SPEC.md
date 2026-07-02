Let me fetch the Postman API documentation and the PrintAutopilot website for more details.Now let me look at the Pipedream source code for the PrintAutopilot component to understand the authentication and API details better.Now I have a comprehensive understanding of PrintAutopilot. Let me also look at the Zapier page for any additional details on available actions.Now I have a thorough understanding of PrintAutopilot. Let me compile the specification.

# Slates Specification for Printautopilot

## Overview

PrintAutopilot is a cloud-based service that connects applications to physical printers, enabling automated PDF document printing via remote print queues. It provides a Windows client that connects to local printers and a REST API to submit documents to those print queues programmatically. It is commonly used to automate printing of packing slips, shipping labels, and other documents in e-commerce and fulfillment workflows.

## Authentication

PrintAutopilot uses two levels of authentication:

1. **Connection Token (Bearer Token):** API requests are authenticated using a Bearer token passed in the `Authorization` header (e.g., `Authorization: Bearer {connection_token}`). This token is associated with your PrintAutopilot account and is used for general API access such as retrieving print jobs. You obtain this token from your PrintAutopilot account dashboard.

2. **Print Queue Token:** Each print queue has its own API Token ("Print Queue Token") that must be provided when submitting documents to a specific queue. This token identifies which print queue to send the document to.

**Base URL:** `https://printautopilot.com/api/`

**API Documentation:** https://documenter.getpostman.com/view/1334461/TW6wJonb

## Features

### PDF Document Queue Submission

Allows automated printing by adding PDF files to a print queue, enabling seamless integration between applications and physical printers. When submitting a PDF, you must specify:

- **File:** The PDF document to print (uploaded as a file).
- **Filename:** The name for the document in the queue.
- **Print Queue Token:** The token identifying which print queue to target.

This is the primary API action. The action uploads the PDF document to the PrintAutopilot queue, after which the Windows client installed on the machine with the connected printer picks it up and prints it.

### Print Job Management

You can retrieve print jobs via the `/print-jobs` endpoint to monitor and track the status of submitted documents. This supports real-time print status monitoring.

### Multiple Print Queues

You can designate multiple print queues for a single printer or across multiple printers. Each queue has its own API token, allowing you to route different types of documents (e.g., packing slips, invoices, labels) to different printers or queues.

- Only PDF documents are supported for printing.
- The service uses a credit-based pay-per-use pricing model with no monthly fees.

## Events

The provider does not support events. There are no webhooks or purpose-built event subscription mechanisms available through the PrintAutopilot API.
