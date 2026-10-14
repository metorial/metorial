# Pdfless Integration Specification

## Overview

Pdfless is a SaaS platform for generating PDF documents from HTML/CSS templates. Users design templates in an online editor, then generate PDFs programmatically by passing dynamic JSON data to the API. It supports features like barcodes, bookmarks, metadata, encryption, and semantic templating with expressions.

## Authentication

Pdfless offers one way to authenticate API requests: API key authentication.

**Obtaining the API Key:**
To find the API key, log into the dashboard at `https://app.pdfless.com`, click "Workspace settings" from the top of the page, and copy the API key from the "API credentials" section.

**Using the API Key:**

The API key can be provided in one of two ways:

1. **HTTP Header:** Pass the key in the `apikey` header:

   ```
   -H "apikey: <api_key>"
   ```

2. **Query Parameter:** Append the key as a query parameter:
   ```
   ?apikey=<api_key>
   ```

The base URL for the API is `https://api.pdfless.com`.

API keys are scoped to a workspace. There are no OAuth flows or additional scopes.

## Features

### PDF Generation from Templates

Users create document templates using an HTML/CSS editor in the Pdfless dashboard, then request generation via `POST /v1/pdfs` with a template ID and a JSON payload of dynamic data. The result includes a temporary provider URL and the generated PDF is prepared for download immediately.

- **`template_id`** (required): The identifier of the pre-designed template.
- **`payload`** (required): JSON object containing the variable data to populate the template.
- **`reference_id`** (optional): A caller-defined reference identifier for tracking purposes.
- The download URL expires after 10 minutes.
- Generation consumes account quota. There is no documented PDF lookup or URL-renewal endpoint, so an expired provider URL cannot be refreshed without generating another PDF.

### Template Discovery

`list_templates` calls `GET /v1/document-templates` with one-based `page` and `pageSize` query parameters (defaults 1 and 25). The provider returns a direct array of templates. The tool exposes each template's ID and title, plus available creation and modification timestamps. Unnamed templates have an empty title. Both pagination inputs remain JSON numbers and must be positive whole numbers at runtime.

### Connected Workspace

`get_workspace` calls `GET /v1/workspaces` to retrieve the workspace tied to the connected API key. Its direct object response supplies name, active status, creation time, and optional modification time. An unnamed workspace has a null name. The documented response does not include a workspace ID.

### Semantic Templating (Expressions)

Templates support a Handlebars-like expression syntax (`{{ }}`) for dynamic content rendering, including variable interpolation with dot-notation for nested properties, conditional statements (`{{#if}}`/`{{else}}`/`{{/if}}`), and array iteration (`{{#each}}`/`{{/each}}`). Triple-stash (`{{{ }}}`) can be used to output raw (unescaped) HTML characters.

### PDF Encryption and Protection

Documents can be encrypted with a user password (required to open) and an optional owner password (to restrict permissions). Granular permission controls include:

- Allow/disallow printing, modifying, copying content, modifying annotations, form filling, screen reader access, and document assembly.
- All permissions default to `true` if not specified.
- Protection options depend on the account subscription. When setting passwords or permission controls, provide a non-empty user password to enable protection.

### PDF Metadata

Users can set PDF metadata such as Author, Title, Subject, Keywords, and other fields using HTML meta tags within the template.

### Bookmarks

Pdfless supports native bookmark integration for easy navigation between pages. Bookmarks are automatically generated from HTML heading tags (`<h1>` through `<h6>`) in the template.

### Hyperlinks and Anchors

Templates support external hyperlinks and internal anchor links within the generated document, using standard HTML `<a>` tags with `href` attributes pointing to URLs or element IDs.

### Barcode Generation

Pdfless includes a barcode generator supporting multiple barcode formats. Barcodes are inserted into templates using a special `{{{barcode}}}` expression with parameters for value, format, and CSS class name.

- Supported formats include: CODE128, CODE39, EAN13, EAN8, EAN5, EAN2, UPC, ITF14, MSI (and variants), Pharmacode, and Codabar.
- Barcode values can be static or driven by template variables.

### Page Styling

Templates support CSS `@page` rules for controlling page size, orientation, margins, padding, and page counters. Custom fonts are also supported.

## Events

The provider does not support events.

## API References

- [Authentication](https://docs.pdfless.com/authentication)
- [PDF generation](https://docs.pdfless.com/pdfs)
- [Native PDF features](https://docs.pdfless.com/native-features)
- [Errors](https://docs.pdfless.com/errors)
- [Official SDK and template/workspace operations](https://github.com/Pdfless/pdfless-js)
- [Official OpenAPI schema](https://github.com/Pdfless/pdfless-js/blob/main/swagger.yml)

The PDF guide documents an object-valued payload, while the official SDK's older OpenAPI model uses a JSON string. This integration preserves its existing object input and request behavior based on the current PDF guide. Templates and workspaces use the endpoint and response shapes from the official SDK/OpenAPI schema.
