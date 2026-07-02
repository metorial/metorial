Now let me look at the actual API documentation:Let me get more details on the Modelry-specific API (which is separate from the CGTrader marketplace API):Now let me look at the Modelry API docs more closely by trying to access the Pipedream GitHub source for more details on available actions:Now I have enough information to compose the specification. Let me compile what I've found:

- Modelry (by CGTrader) is a 3D product visualization platform for eCommerce
- API base URL: `https://api.modelry.ai/api/v1/`
- API documentation at: `https://files.cgtarsenal.com/api/doc/index.html`
- Authentication: API token (key-based), passed as `Authorization` header
- API token found in user menu under "API Token"
- Resources: Products, Modeling requests, Embeds, Product assets, Workspaces
- Actions available: Create Product, Get Product, Delete Product
- Product properties: SKU, title, batch_id, description, tags, dimensions, external_url
- No evidence of webhook/event support found

# Slates Specification for Modelry

## Overview

Modelry (by CGTrader) is a 3D product visualization platform that allows businesses to order, manage, and publish custom 3D models for eCommerce. It provides digital asset management (DAM), quality assurance tools, and embeddable 3D/AR viewers. The API enables programmatic management of products, modeling requests, embeds, and product assets.

## Authentication

Modelry uses API keys for authentication.

To obtain your API token:

1. Click the user menu on the left button.
2. Scroll down to "API Token".

The API token is passed in the `Authorization` header of each request. The base URL for all API requests is `https://api.modelry.ai/api/v1/`.

Example request:

```
GET https://api.modelry.ai/api/v1/workspaces
Headers:
  Content-Type: application/json
  Authorization: <your_api_token>
```

## Features

### Product Management

Create, retrieve, and delete products in the Modelry platform. Products represent the items for which 3D models are created and managed. When creating a product, you can specify:

- **SKU** – A unique product identifier.
- **Title** – The product name.
- **Batch ID** – Associate the product with a batch for bulk operations.
- **Description** – A text description of the product.
- **Tags** – Labels for categorizing and searching products.
- **Dimensions** – Physical dimensions of the product.
- **External URL** – A link to the product's page (e.g., on your eCommerce store).

### Modeling Requests

The API enables you to create, update, delete, and retrieve data for resources such as Products, Modeling requests, Embeds and Product assets. Modeling requests represent orders for 3D model creation. You can track the status of requests and manage the lifecycle of 3D model production.

### Embeds

Manage embeddable 3D and AR viewers that can be published on eCommerce product pages. Publish with app-less 3D and AR viewers that provide 360 degree spinnable angles at standard and high resolution.

### Product Assets

Manage the digital asset files associated with products. Modelry allows customers to order 3D models in a wide array of file types, including gltf, .glb, .usdz, Meta Platforms, Google Swirl, 3ds, and Max Model with V-Ray render engine, that are compatible across platforms and optimized for size limits.

### Workspaces

List and manage workspaces within your Modelry account. Workspaces serve as organizational containers for products and assets.

## Events

The provider does not support events. There is no documented webhook or event subscription mechanism in the Modelry API.
