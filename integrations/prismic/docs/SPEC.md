# Slates Specification for Prismic

## Overview

Prismic is a headless content management system (CMS) that provides a content repository with a REST API and GraphQL API for delivering structured content to websites and applications. It offers content modeling through custom types and slices, a visual page builder for content editors, and built-in image optimization via Imgix. The Content API is used to read content from your Prismic repository, supporting common features like filtering, sorting, and pagination, with content served as JSON.

## Authentication

Prismic uses multiple authentication methods depending on which API is being accessed:

### Content API (Read)

- All published content is publicly accessible through the API by default. To limit or expand access, navigate to the repository's Settings > API & Security page and adjust the API access setting.
- For maximum security, use Private API to authenticate all requests with an access token. You'll need to generate an access token in your repository's settings and configure your client to use it.
- The access token is passed as a query parameter (`access_token`) when calling the Content API endpoint at `https://{your-repo-name}.cdn.prismic.io/api/v2`.
- Content API access tokens are **read-only**.

### Write APIs (Types API, Migration API, Asset API)

- To authenticate your request with the Custom Type API, you will need two things: your repository ID and a bearer access token.
- Find this token in your repository's Settings > API & Security section. Click the Write APIs tab. Here you can generate your access tokens. You can use multiple bearer access tokens for different applications.
- The bearer token is sent in the `Authorization: Bearer <token>` header along with a `repository` header containing the repository name.
- The Migration API uses a separate migration-specific token, a write migration API access token is required to authorize the migration process. Users can generate this token from their Prismic repository's API & Security settings.

### Authentication API (User Session)

- The endpoint URL for the Authentication API is `https://auth.prismic.io/login` and the method is POST.
- The Authentication API accepts a user email address and password and returns a user session token to use with other API endpoints.

## Features

### Content Querying

The Content API is used to read content from your Prismic repository. The API supports common features, like filtering, sorting, and pagination. Content is served as JSON and works directly with Prismic's SDKs. You can query documents by ID, UID, type, tags, or using advanced filters (full-text search, date ranges, geolocation proximity, content similarity). To access the Content API endpoint, you will need a ref. The ref specifies what version of your content to query — this can be the master (published) ref or a release ref for previewing scheduled content.

- Supports filtering by document type, tags, field values, and custom predicates.
- Results can be sorted by any field and paginated.
- A GraphQL API is also available as an alternative query interface.

### Content Type Management

The Types API allows managing content models. You can programmatically create, read, update, and delete custom types and shared slices that define the structure of your content.

- Custom types define the schema for documents (e.g., pages, blog posts).
- Shared slices are reusable page sections that can be used across multiple content types.
- The Status is a boolean field that indicates whether the custom type is currently active or disabled in the Prismic Repository.

### Content Migration

The Migration API endpoint allows developers to upload pages to a Prismic repository. The Migration API endpoint allows developers to create and update pages in a Prismic repository.

- Pages will be created as drafts, which you can publish in your repository. By default, pages created or updated via the Migration API will be added to a migration release.
- As a security measure, it is impossible to programmatically publish changes in Prismic. All changes must be reviewed and published through the Prismic UI.
- Supports creating and updating documents including all field types (rich text, images, links, slices, etc.).

### Asset Management

The Prismic Asset API allows you to manage your repository assets in media library. The media library is Prismic's built-in asset manager for images, videos, and other files.

- Upload, update, and delete assets (images, documents, videos).
- Prismic supports PNG, JPEG, WEBP, GIF, JPE, JPG, ICO, and JFIF.
- The maximum image size is 10MB; other file types, including videos, can be up to 100MB.
- Prismic serves images through imgix, a powerful image hosting platform, enabling compression, formatting, and web optimization.

### Integration Fields

The integration field allows you to integrate third-party data into your repository, such as from e-commerce catalogs or custom APIs.

- Supports pulling data from an external API endpoint or pushing data to Prismic via a dedicated write endpoint.
- Once the catalog is created, Prismic will begin its initial pull from your API and will periodically re-pull. Data is pulled every 30 minutes.
- Built-in connectors for services like Shopify are available.

## Events

Prismic supports webhooks that send HTTP POST requests to a URL of your choosing when specific events occur in the repository. Webhooks are configured in the repository's Settings > Webhooks page. An optional secret can be included in the payload for verification. Custom headers can also be added to webhook requests.

### Document Changes

Triggered when a page (document) is published or unpublished. The payload includes an array of affected document IDs. Note: published and unpublished events have identical payload structures and cannot be distinguished from the payload alone.

### Release Changes

Triggered when a release is created, edited, or deleted. The payload includes release metadata (ID, ref, label, scheduled date) and the IDs of documents within the release.

### Tag Changes

Triggered when a new tag is added to or removed from the repository. Tag addition triggers occur only the first time a document is published with a new tag. The payload includes the tag ID and any affected document IDs.
