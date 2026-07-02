Let me get more details on the webhooks and additional features from the docs.# Slates Specification for Intelliprint

## Overview

Intelliprint is a UK-based hybrid mail service that allows businesses to send physical letters and postcards programmatically. Users upload documents online, and Intelliprint handles printing, packing, and posting, dispatching mail via Royal Mail with tracking available.

## Authentication

Intelliprint API uses account-level API keys to authenticate you to your account. API keys are provided in the Authorization header using HTTP Bearer authentication.

To obtain an API key:

1. All Intelliprint accounts can create an API key in the API Keys section of their account.
2. API keys are displayed only once when they are created. Intelliprint does not store them.

There are no separate API keys for test mode. Instead, when you want to create a test Print Job, just set the `testmode` parameter to `true`.

Example usage:

```
Authorization: Bearer key_EXAMPLE
```

## Features

### Print Job Management

The core feature of Intelliprint. You can implement Print Jobs however you want — programmatically send thousands of letters with one API call, or use a draft-based workflow with previewing, editing, and confirming.

- **Type**: Send letters or postcards by setting the `type` parameter.
- **Confirmation**: Print jobs can be created as drafts (`confirmed: false`) and confirmed later, or confirmed immediately.
- **Reference**: A user-provided reference can be attached to each print job.
- **Metadata**: A key-value object for storing any information you want along with the Print Job.
- **Test mode**: You do not pay for test Print Jobs, even if you confirm them. They are never sent out. Testmode Print Jobs are deleted from the system a week after they're confirmed.

### Content Strategies

Three ways to provide content for a print job:

- **Files**: Upload pre-generated PDF, Word, RTF, PNG, or JPEG files. If a letter file already has an address in the correct position, recipient information can be read directly from the file.
- **Text/HTML Content**: Provide text or HTML-formatted content as a string in the `content` field.
- **Templates**: Use pre-designed templates created in the Intelliprint Dashboard. Templates support dynamic fields (variables) for personalizing content per recipient, including textboxes and QR codes. Templates are referenced by their ID.

### Bulk Mail

Large documents can be split into individual letters automatically, or batch mailings can be sent with a single API call. Document splitting is configured via options like `split_by_content` with a splitting keyword.

### Postage Services

Multiple UK and international postage services are available:

- **UK Second Class** (default, most economical, 2-3 days)
- **UK First Class** (1-2 days)
- **Signed For** variants (first and second class, with proof of delivery)
- **Special Delivery** (next day by 9am or 1pm, tracked and signed)
- **Tracked 24/48** (tracked without signature)
- **International** (for destinations outside the UK)
- Postcards only support UK First and Second Class.

### Envelope and Postcard Sizes

Letters can be sent in various envelope sizes: **C5** (up to 15 folded sheets), **C4** (up to 50 sheets), **C4 Plus** (up to 250 sheets), and **A4 Box** (up to 1,800 sheets). Envelopes are automatically upgraded if content exceeds the selected size. Postcards are available in **A6**, **A5**, and **A5 Enveloped** sizes.

### Scheduling

Print jobs can be scheduled for a future date using a UNIX timestamp via the `mail_date` parameter. By default, jobs submitted by 3PM (London time) Mon-Fri are printed and shipped the same day.

### Tracking

Each mail item in a print job has its own status, progressing through: `draft`, `waiting_to_print`, `printing`, `enclosing`, `shipping`, `sent`, `returned`, `cancelled`, or `invalid_address`. Tracking numbers are provided for postage services that support tracking.

### Cancellation

Print jobs can be cancelled before they enter production.

### Reusable Backgrounds

Background images or letterheads can be applied to print jobs.

### Extra Documents

Additional documents can be attached to print jobs, with options to apply backgrounds to those documents as well.

### Content Manipulation

Options are available to adjust page positioning (horizontal/vertical offsets in mm) and to remove letters containing a specific phrase.

## Events

Intelliprint supports webhooks for receiving near real-time HTTP notifications about print job lifecycle events. Webhooks are configured in the API Keys section of the account dashboard.

### Letter Updates

- **Event**: `letter.updated`
- Triggered when a letter's status changes — specifically when a letter is printed, dispatched, delivered, or returned.
- The payload includes the letter ID, print job ID, status, postage service, envelope type, reference, shipped date, and return information (reason and date) if applicable.

### Mailing List Address Validation

- **Event**: `mailing_list.addresses_validated`
- Triggered when addresses in a mailing list have been validated. This is a paid add-on service.
