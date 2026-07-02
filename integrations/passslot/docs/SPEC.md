Now let me get the events documentation:# Slates Specification for Passslot

## Overview

PassSlot is a cloud service for creating and managing mobile wallet passes (coupons, loyalty cards, event tickets, boarding passes, etc.) for Apple Wallet, Android Pay, and HTML5. It helps users build their own mobile wallet using Apple Wallet (Passbook), Android Pay (Google Wallet) and HTML5 to distribute mobile passes to all major platforms. It supports all Apple Wallet pass styles: Coupons, Store Cards, Event Tickets, Membership / Generic Cards and Boarding Passes.

## Authentication

PassSlot uses App Key-based authentication. You can create multiple app keys with different access permissions to your pass templates and/or pass type IDs. The app key can be sent as the username in HTTP Basic Authorization (with an empty password) or directly in the Authorization header of your request.

- **Base URL:** `https://api.passslot.com/v1`
- **Method:** HTTP Basic Auth with the App Key as the username and an empty password
- Example: `curl -u <APP-KEY>: https://api.passslot.com/v1`

All communication with the API must be encrypted using HTTPS. You should verify the SSL certificate on the client side to prevent key theft.

App keys are created and managed from the PassSlot dashboard.

## Features

### Pass Template Management

Templates define the entire appearance and configuration of a pass, including style, colors, images, text fields, barcode settings, locations, verification/redemption settings, branding, and payment integration. Templates allow you to manage thousands of individual passes without updating them one by one — all changes to a template are applied to all generated individual passes of that template.

- Create, read, update, and delete pass templates.
- Configure template images (logo, icon, strip, etc.) at various resolutions.
- Configure template actions (verification/redemption behavior).
- Configure custom branding settings (e.g., footer images).
- Set distribution restrictions on templates.
- Configure payment settings with built-in support for PayPal, Stripe, or PAYMILL.

### Pass Generation and Management

The system generates an individual, unique pass based on a chosen template for every user that requests it. With the placeholder system, every pass can be customized and personalized.

- Generate passes from templates by ID or by template name, with custom placeholder values and optional images.
- Download passes as `.pkpass` files or retrieve their JSON representation.
- Get short distribution URLs for passes.
- Send passes to users via email.
- Delete passes.

### Pass Updates

Passes can be updated after they were generated.

- Update placeholder values on individual passes (e.g., balance, name, status).
- Update or replace pass-specific images.
- Update pass status (e.g., void/invalidate a pass).
- Set custom pricing per pass.
- By default, PassSlot automatically sends push notifications to Apple Wallet when you change a pass value. Manual push triggers are also available.

### Pass Scanning and Redemption

Together with the free Pass Verifier app you can scan, validate, redeem passes or change fields of the passes.

- Create and manage scanner configurations via the API.
- Scanners support actions like scan, redeem, reactivate, and field update.

### Pass Type ID Management

- List and view available Apple Wallet pass type identifiers associated with your account.

## Events

PassSlot supports webhooks. You register a URL that PassSlot will POST to anytime an event happens to your Wallet passes. When the event occurs, PassSlot creates an event object containing all relevant information and sends it as an HTTP POST request to your registered URLs.

Webhooks can be configured in the webhooks section of the PassSlot dashboard, where you can add multiple receiving URLs. Events are digitally signed with HMAC-SHA1 using a shared secret, with the signature included in the `X-Passslot-Signature` HTTP header.

### Pass Events

Events related to pass lifecycle:

- **pass.created** — A pass was generated.
- **pass.updated** — A pass was updated.
- **pass.downloaded** — A pass was downloaded.

Data includes the pass serial number, pass type identifier, template ID, and distribution URL.

### Registration Events

Events related to device registrations (Apple Wallet installations):

- **registration.created** — A device registered to receive push notifications for a pass (pass added to Apple Wallet).
- **registration.deleted** — A device unregistered (pass removed from Apple Wallet or notifications disabled).

Data includes the device library identifier, pass serial number, pass type identifier, and template ID.

### Scan Events

Events related to pass scanning and redemption:

- **scan.performed** — A pass was scanned using the PassSlot redemption system.

Data includes the scanner ID, pass identifiers, the action performed (scan, redeem, reactivate, or update), timestamp, authorization status, and optional field update details.
