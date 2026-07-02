# Slates Specification for DocRaptor

## Overview

DocRaptor is a cloud-based API service that converts HTML, CSS, and JavaScript into PDF and Excel (XLS/XLSX) documents. It is powered by the Prince PDF converter, providing advanced PDF features like mixed page layouts, accessible PDFs, headers/footers, and form generation. DocRaptor can convert HTML files into high quality PDF documents or XLS/XLSX files.

## Authentication

DocRaptor uses API key-based authentication. To integrate directly with the REST API, you'll need to authenticate with your API key, which can be found on your account dashboard.

Two authentication methods are supported:

1. **HTTP Basic Authentication (preferred):** Use a blank password and your API key as the username. The credentials must be formatted precisely and then Base64 encoded (i.e., `Base64.encode("YOUR_API_KEY_HERE:")`). Alternatively, the API key can be embedded directly in the URL: `https://YOUR_API_KEY_HERE@api.docraptor.com/docs`.

2. **Query Parameter:** Use the GET parameter `user_credentials` with your API key as the value.

The base API endpoint is `https://api.docraptor.com/docs`.

A public test key (`YOUR_API_KEY_HERE`) is available for testing without creating an account, but the only requirement is test mode must be used (test parameter set to true).

## Features

### HTML to PDF Conversion

Convert HTML/CSS/JavaScript content into PDF documents. Content can be provided either as inline HTML via `document_content` or by referencing a URL via `document_url`.

- **JavaScript processing:** By default, JavaScript is disabled to speed up creation time. To enable JavaScript, set the `javascript` parameter to true. DocRaptor offers two JavaScript engines: its own custom engine (with support for libraries like Highcharts and Typekit) and Prince's native engine.
- **Media type:** Print media rules are applied by default. Using "print" when you really want "screen" is the most common issue users experience.
- **Base URL:** Configurable for resolving relative URLs in the document content.
- **PDF security:** Options for encryption, password protection (user and owner passwords), and restricting printing or copying.
- **Test mode:** Creates the document in test mode. All plans have unlimited test documents that do not count against monthly limits. Test PDFs are watermarked.
- **HTML validation:** Can optionally enforce strict HTML validation before conversion.
- **Resource error handling:** Configurable behavior for how to handle failures when downloading external resources (CSS, images).

### HTML to Excel Conversion

Convert HTML/XML content into XLS or XLSX spreadsheet files. Excel files should be XML while PDFs can be converted from HTML. For Excel files, input is always validated as XML. Unlike PDFs, XLS files are not free-form, and elements must map to XLS cells clearly and exactly.

### Asynchronous Document Generation

For very large or complex documents, asynchronous job creation extends the processing time to 600 seconds, queues the document for background creation, and returns a `status_id`. The status can be polled, and the completed document can be downloaded via a provided URL. A `callback_url` parameter can also be set so DocRaptor sends a POST request after successfully completing the job.

- Statuses include: queued, working, completed, failed, and killed.
- The download URL can be used to download your document up to 100 times, and will expire after your account's data retention period.

### Document Hosting

With document hosting, the API publishes the new document at an unbranded URL. It can be hosted for as long as needed or deleted after a specific date or number of downloads.

- To create a hosted document, set the `hosted` parameter to true.
- Configurable download limits (`hosted_download_limit`) and expiration dates (`hosted_expires_at`).
- You may manually expire a hosted document at any time.
- Hosted documents have a file size limit.

### Document Listing

A list of previously created documents can be accessed through the API, including information like the name, the date, and if it was a test document. Because DocRaptor doesn't actually store the created document, it can't return that.

### Accessible PDF Generation

DocRaptor's automatic tagging and CSS-based tagging features make it easy to create PDF files that meet WCAG 2.0, Section 508, and ISO-14289 accessibility standards.

### PDF Forms

Automatically convert raw HTML forms into PDF forms, including accessible forms for screen readers.

### Advanced PDF Layout

Mix and match different page sizes, styles, and headers and footers all within the same PDF document. Supports footnotes, table of contents, page numbers, crop marks, and content floating to page margins.

### IP Listing

Use this endpoint to get a list of IP addresses that DocRaptor currently uses to download assets. Useful for firewall whitelisting.

## Events

The provider does not support events in the traditional webhook/subscription sense. The only callback mechanism is the `callback_url` parameter on asynchronous document generation jobs, which sends a POST request when the document has been rendered successfully. This is a one-time callback per job, not a subscription-based event system.
