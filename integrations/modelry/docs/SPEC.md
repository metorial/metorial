# Modelry integration

## Authentication

An API token is sent directly in the Authorization header. Obtain it from Modelry settings. The API base is https://api.modelry.ai/api/v1.

## Tools

- Products: create_product, get_product, update_product, delete_product, list_products.
- Workspaces: list_workspaces.
- Modeling requests: list_modeling_requests, get_modeling_request.

List tools expose optional pagination and filters. Modeling request lookup accepts an ID or SKU. Product updates require at least one field.

## Scope

Modeling request creation, viewer operations, file operations, and events are not implemented.

[Official API reference](https://files.cgtarsenal.com/api/doc/index.html)
