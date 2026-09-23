Now I have enough information to create a comprehensive specification for Google Docs.

# Slates Specification for Google Docs

## Overview

Google Docs is a cloud-based word processor that is part of Google Workspace. The Google Docs API allows applications to create, read, and modify Google Docs documents programmatically, enabling document automation, content generation, and integration with external systems.

## Authentication

Google APIs use the OAuth 2.0 protocol for authentication and authorization. The Google Docs API supports the following authentication methods:

### OAuth 2.0 (User Authentication)

OAuth2 allows you to make API calls on behalf of a given user. In this model, the user visits your application, signs in with their Google account, and provides your application with authorization against a set of scopes.

**Endpoints:**

- Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
- Token endpoint: `https://oauth2.googleapis.com/token`
- Revoke endpoint: `https://oauth2.googleapis.com/revoke`

**Required credentials:**

- Client ID
- Client Secret
- Redirect URI (must be registered in Google Cloud Console)

**OAuth 2.0 Scopes:**

| Scope                                                | Description                                                               | Sensitivity                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------- |
| `https://www.googleapis.com/auth/documents`          | See, edit, create, and delete all Google Docs documents                   | Sensitive                   |
| `https://www.googleapis.com/auth/documents.readonly` | See all Google Docs documents                                             | Sensitive                   |
| `https://www.googleapis.com/auth/drive.file`         | See, edit, create, and delete only specific Drive files used with the app | Non-sensitive (Recommended) |

The restricted broad Drive scopes (`drive`, `drive.readonly`) are not requested by this integration. Connections that granted them previously keep working; new connections rely on the Docs scopes plus `drive.file`, so Drive-level operations (listing documents, replacing content via Markdown upload) apply only to files created or opened through this connection.

### Service Account (Server-to-Server)

Service account credentials allow your application to talk directly to Google APIs using a Service Account. It's useful when you have a backend application that will talk directly to Google APIs from the backend.

Service accounts use JWT-based authentication. They can access documents owned by the service account or documents shared with the service account. For Google Workspace users, service accounts can use domain-wide delegation to impersonate users.

**Setup requirements:**

1. Create a Google Cloud project
2. Enable the Google Docs API
3. Create a service account and download credentials JSON
4. Share documents with the service account email or configure domain-wide delegation

## Features

### Document Management

Create new documents with a title and retrieve existing documents by their ID. The create method returns a documentId you can use to add content to the document afterwards with the batchUpdate method. There is no parameter to directly add content.

- Create empty documents with specified titles
- Create native Google Docs documents by importing Markdown through Drive
- Replace a native document's full body by re-importing Markdown while preserving its file ID
- Retrieve document content as structured JSON
- Export document content for processing

Markdown conversion uses Drive v3 multipart uploads with `text/markdown` media and the target MIME type `application/vnd.google-apps.document`. `create_document_markdown` sends `files.create`; `update_document_markdown` sends `files.update`, whose import behavior replaces the full document contents. Both tools require `drive.file` or broader writable Drive access and accept at most 5 MiB minus 16 KiB (5,226,496 bytes) of non-empty UTF-8 Markdown, reserving headroom for the multipart metadata part within Drive's 5 MiB multipart request limit.

### Content Editing

Google documents follow an operational transform model, which means you can't directly update a document. Instead, you need to create a list of changes to apply to the document.

- Insert, delete, and replace text at specific positions
- Insert page breaks and section breaks
- Use named ranges to reference and manipulate specific document sections

### Text Formatting

Text styling and formatting are essential for emphasizing parts of your document, organizing information, and improving readability. The Google Docs API offers a comprehensive set of features for this purpose.

- Apply font styles (bold, italic, underline, strikethrough)
- Set font family, size, and color
- Apply paragraph styles (alignment, spacing, indentation)
- Create and manage custom styles

### Lists and Bullets

Adding bullets and numbering programmatically is a powerful feature of the Google Docs API that can help format lists within a document. This functionality is especially useful for dynamically generated documents or reports that require structured data presentation.

- Create bulleted and numbered lists
- Customize list formatting and nesting levels

### Tables

Table manipulation through the Google Docs API is a powerful feature that enables dynamic content creation and data presentation. By utilizing these API calls, developers can programmatically adjust table structures, tailor content to specific needs, and enhance the overall document appearance and functionality.

- Insert and delete tables
- Add and remove rows and columns
- Modify cell content and formatting
- Merge and unmerge cells

### Images

Insert inline images from URLs into documents.

- Insert images at specific positions
- Set image dimensions and properties
- Limited support for extracting images from documents

### Named Ranges

Named ranges are a powerful feature in the Google Docs API that allow you to reference specific parts of your document programmatically. This can be particularly useful for documents that are frequently updated or require dynamic content changes. Named ranges give you the ability to easily locate and manipulate sections of your document without having to keep track of specific indices.

- Create named ranges to bookmark document sections
- Reference named ranges for targeted updates
- Useful for template-based document generation

### Document Structure

Google documents are divided into structural elements (paragraph, section break, table, and table of contents). And then paragraphs encapsulate a variety of elements like text (textRun), images (inlineObjectElement), or list items (Bullet).

- Access document body, headers, footers
- Work with multiple document tabs
- Retrieve document metadata and revision information

### Template Merging

For example, if you're an HR manager, you might use the same template for offer letters. Instead of manually populating information, you can use the Docs API to automatically populate details in an offer letter every time a candidate reaches the right stage.

- Replace placeholder text with dynamic values
- Automate document generation from templates
- Combine with named ranges for precise content insertion

## Events

This integration does not currently expose event triggers.
