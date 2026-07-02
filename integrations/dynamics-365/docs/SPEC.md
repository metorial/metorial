# Slates Specification for Dynamics 365

## Overview

This package is the single `dynamics-365` Slates integration for Microsoft
business applications. It merges the former Dynamics subservice and Business
Central packages into one unreleased contract with fresh subservice-prefixed
tool IDs and explicit resource auth/config fields.

Covered services include Dataverse, Sales, Customer Service, Field Service,
Contact Center, Customer Insights, Finance, Supply Chain, Project Operations,
Commerce, Human Resources, and Business Central.

## Auth Contract

Supported auth methods:

- `oauth_common`: Work & Personal delegated Microsoft OAuth. Resource inputs
  enable the corresponding token families: `dataverseInstanceUrl`,
  `finOpsBaseUrl`, and `businessCentralEnvironmentName` with optional
  `businessCentralTenantId` for direct-tenant Business Central URLs. Empty
  OAuth input defaults to Business Central `production`.
- `oauth_organizations`: Work Only delegated Microsoft OAuth. Resource inputs
  enable the corresponding token families: `dataverseInstanceUrl`,
  `finOpsBaseUrl`, and `businessCentralEnvironmentName` with optional
  `businessCentralTenantId` for direct-tenant Business Central URLs. Empty
  OAuth input defaults to Business Central `production`.
- `microsoft_client_credentials`: app-only Microsoft tokens for Dataverse,
  Finance and Operations, and Commerce Retail Server. Commerce requires both
  `commerceServerResourceId` and `retailServerUrl`.
- `commerce_access_token`: direct Commerce Retail Server bearer token.

Only these auth keys are exposed. The integration does not discover Dataverse
environments or infer resource URLs. Tools throw `ServiceError` when their
required resource token or config is absent.

## Config Contract

Canonical config fields include:

- Dataverse: `dataverseInstanceUrl`, `dataverseApiVersion`.
- Finance and Operations: `finOpsBaseUrl`, `finOpsDefaultLegalEntity`,
  `finOpsDefaultPageSize`, `finOpsDefaultMaxPages`.
- Project Operations Dataverse lists: `projectOperationsDefaultPageSize`.
- Business Central: `businessCentralEnvironmentName`, optional
  `businessCentralTenantId`, `businessCentralCompanyId`,
  `businessCentralDefaultLimit`.
- Commerce: `retailServerUrl`, `commerceOperatingUnitNumber`,
  `commerceLocale`, `commerceChannelId`, `commerceCatalogId`,
  `commerceDefaultPageSize`, `commerceMaxPageSize`.

No old config aliases are supported.

## Tool Surface

All tools use a subservice prefix:

- `dataverse_*` for generic Dataverse records, metadata, search, relationships,
  actions/functions, file/image columns, `$batch`, and Dataverse triggers.
- `sales_*`, `customer_service_*`, `field_service_*`, `contact_center_*`, and
  `customer_insights_*` for Dataverse-backed product workflows.
- `finance_*`, `supply_chain_*`, and `human_resources_*` for Finance and
  Operations OData resources.
- `project_operations_*` for Project Operations Dataverse resources, schedule
  OperationSets, and Finance handoff checks.
- `commerce_*` for Commerce Retail Server workflows.
- `business_central_*` for Business Central API v2.0 resources.

Tool names and descriptions start with the subservice display label, for example
`Finance: List Customers` and `Business Central: List Customers`.

## Schema Requirements

All tool input schemas serialize to a top-level JSON Schema object. Variant
inputs use enum fields plus optional variant-specific fields, with incompatible
combinations rejected at runtime through `ServiceError`.

## File Output Requirement

Tools that return file bytes use Slate attachments. Output schemas must not
expose base64 or full file text fields such as `contentBase64`, `fileContent`,
or `csvData`.
