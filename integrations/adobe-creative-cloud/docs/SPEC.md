Now I have enough information to write the specification.

# Slates Specification for Adobe Creative Cloud

## Overview

Adobe Creative Cloud is a suite of desktop and cloud-based creative applications (Photoshop, Illustrator, Lightroom, InDesign, After Effects, etc.) along with cloud services for asset storage, shared libraries, and generative AI capabilities. The Creative Cloud Developer Platform is a collection of APIs and SDKs that let you extend and integrate with Creative Cloud apps and services. The platform exposes several REST APIs including Creative Cloud Libraries, Lightroom, Photoshop, Firefly (generative AI), User Management, and Adobe Stock.

## Authentication

Adobe Creative Cloud APIs use **OAuth 2.0** for authentication, managed through the **Adobe Developer Console** (https://developer.adobe.com/console). There are two credential types:

### OAuth User Authentication (Authorization Code Flow)

Used when acting on behalf of an end user. Adobe services like Creative SDK, Photoshop, Adobe Analytics, etc. use the OAuth 2.0 protocol for authentication and authorization. Using Adobe OAuth 2.0, you can generate access tokens to make API calls from your web server or browser-based apps.

- **Authorization endpoint:** `https://ims-na1.adobelogin.com/ims/authorize/v2`
- **Token endpoint:** `https://ims-na1.adobelogin.com/ims/token/v3`
- **Required credentials:** Client ID and Client Secret from the Adobe Developer Console project, plus a configured Redirect URI.
- Scopes include: `openid`, `creative_sdk`, `profile`, `address`, `AdobeID`, `email`, `cc_files`, `cc_libraries`. The exact scopes needed depend on the APIs being accessed.

### OAuth Server-to-Server (Client Credentials Flow)

Used for backend/service-to-service integrations without user interaction. The OAuth Server-to-Server authentication is ideal for backend services needing API access without user interaction. It uses the OAuth 2.0 `client_credentials` grant type to authenticate the client application.

- **Token endpoint:** `https://ims-na1.adobelogin.com/ims/token/v3`
- **Required credentials:** Client ID and Client Secret from the Adobe Developer Console project.
- The scope parameter for Firefly Services is: `openid,AdobeID,session,additional_info,read_organizations,firefly_api,ff_apis`. Scopes vary by API.
- Enterprise customers must be assigned the System Administrator or Developer role in the Adobe Admin Console to access the Adobe Developer Console.

**Note:** The Service Account (JWT) credentials have been deprecated in favor of the OAuth Server-to-Server credentials. Creating new JWT credentials stopped by May 1, 2024.

All API calls require including the Client ID as an API key header (typically `x-api-key` or `X-API-Key`) and the access token as a `Bearer` token in the `Authorization` header.

## Features

### Creative Cloud Libraries Management

Libraries are accessible across all of Adobe's tools and offer a way to organize logos, colors, and other assets so they can be easily accessed and re-used. The Libraries API lets you bring Libraries to your products and services.

- Browse, retrieve, create, and delete libraries and their elements.
- Enable users to create libraries and add creative elements to their Libraries within your application so that they can start using these creative elements in their favorite Creative Cloud applications.
- Supported element types include colors, character styles, logos, images, and graphics.
- Adobe is not currently accepting new integrations for the CC Libraries API. Existing integrations continue to work.

### Photoshop API (via Firefly Services)

The Adobe Photoshop API is now integrated into Firefly Services. The API follows REST-like principles, utilizing standard HTTP response codes, verbs, and authentication methods that return JSON-encoded responses.

- Edit PSD files programmatically: manipulate layers, apply smart object edits, run actions.
- Includes APIs for removing backgrounds, smartly cropping images and automatically leveling the horizon in a photo, as well as access to core AI-driven Photoshop features like Generative Fill and Expand.
- Both Photoshop and Firefly APIs generally require input and output images to be served from cloud storage or pre-signed URLs. These APIs currently support S3, Azure Blob Storage, and Dropbox.
- Photoshop API operations are asynchronous; results are polled via a status URL.

### Lightroom API

Two separate Lightroom APIs exist:

**Lightroom User Content API:** Lightroom content of a Creative Cloud customer is managed through a set of RESTful APIs. These APIs are available only to entitled partner applications that have authenticated the customer.

- Manage user catalogs, assets (photos/videos), albums, and metadata.
- Upload images and videos to a user's Lightroom cloud catalog.
- Retrieve renditions and asset metadata.
- Apply and read XMP develop settings.

**Lightroom Image Editing API (via Firefly Services):** The Adobe Lightroom API is now integrated into Firefly Services.

- Apply Lightroom presets and auto-adjustments to images programmatically.
- Requires cloud storage (S3, Azure, Dropbox) for input/output files, similar to the Photoshop API.

### Firefly API (Generative AI)

Firefly Services is a solution for seamless content generation at scale. Firefly Services includes Firefly APIs, Lightroom APIs, Photoshop APIs, and Content Tagging APIs.

- Generate images from text prompts (text-to-image).
- Generative Fill and Generative Expand for images.
- Automatically swap text, video, audio, and animations in motion graphics templates with the Dynamic Graphics Render (DGR) API to produce ready-to-publish clips.
- Translate and Lip-Sync APIs instantly localize video content.
- Object compositing for placing product shots into realistic scenes.
- Custom Models for fine-tuning Firefly on brand-specific assets.
- Content Tagging for automatic labeling of assets.
- Firefly APIs are synchronous, meaning that after making a request, you will receive the results in the response within a few seconds.
- The Firefly API is only available on an enterprise plan.

### InDesign API

Import and integrate relevant data to accurately generate product catalogs, in-store marketing, and more with the Adobe InDesign API.

- Merge data into InDesign templates and export to PDF, JPEG, or PNG.
- Automate document generation workflows.

### User Management API

The User Management API allows clients to manage their users and product entitlements. The User Management API provides programmatic access to the user accounts that are associated with your Adobe organization. You can integrate this API into your organization's administrative applications and processes. You can use the API to create, update, and delete user accounts for your enterprise, and retrieve information about your Adobe users and their access to Adobe products.

- Manage user identities (Adobe ID, Enterprise ID, Federated ID).
- Assign and remove product profile memberships and administrative roles.
- Requires System Admin role to configure.

### Adobe Stock API

- Search Adobe Stock for images, videos, vectors, and templates.
- License and download stock assets.
- Manage license history and entitlements.

## Events

Adobe Creative Cloud supports events via **Adobe I/O Events**, which delivers notifications through webhooks or a Journaling (pull) API. Adobe I/O Events will call predefined webhooks within seconds of an event triggering, enabling you to build near-real time applications. Events are configured through the Adobe Developer Console by creating an Event Registration.

### Creative Cloud Assets (Files and Directories)

Events for files and directories stored in Creative Cloud Assets:

- **File Created** – A new file was uploaded or added.
- **File Updated** – An existing file was modified.
- **File Deleted** – A file was removed.
- **Directory Created** – A new folder was created.
- **Directory Updated** – A folder was modified.
- **Directory Deleted** – A folder was removed.

### Creative Cloud Libraries

I/O Events makes it possible to listen for changes to Creative Cloud Libraries and get a notification when those changes occur. Developers can subscribe to create, delete, and update events for a user's Creative Cloud Libraries.

- **Library Created** – A new library was created.
- **Library Updated** – A library was modified (e.g., elements added or changed).
- **Library Deleted** – A library was removed.
- Currently there is no way to listen for element-level changes only on a Library.

### Cloud Document Events (Photoshop, Illustrator, XD)

Events for cloud documents in specific applications. Each provider supports:

- **Cloud Doc Created** – A new cloud document was created.
- **Cloud Doc Updated** – A cloud document was modified.
- **Cloud Doc Deleted** – A cloud document was removed.

Available providers: Adobe Photoshop Cloud Docs, Adobe Illustrator Cloud Docs, Adobe XD Cloud Docs.

### Photoshop API Job Completion Events

Photoshop supports eventing through Adobe's serverless platform, Adobe IO Events. In this model, the client doesn't need to poll the status continuously, as a job completion event will be emitted to IO Events, to which a webhook or IO runtime action can subscribe.

- Subscribe to get notified when an asynchronous Photoshop API job completes.

### Authentication Options for Events

For Asset Events providers, you have the option of selecting which type of authentication to use, either Server-to-Server Authentication (OAuth Server-to-Server) or User Authentication (OAuth). Server-to-server receives all events within the organization, while user-based OAuth receives events scoped to the authenticated user.
