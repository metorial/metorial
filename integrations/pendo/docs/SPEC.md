# Slates Specification for Pendo

## Overview

Pendo is a product analytics and in-app guidance platform. This integration uses
the Pendo Engage API for product analytics resources, metadata, segments,
reports, aggregation queries, and bulk deletion status. It also supports the
server-side Track Event endpoint when the auth profile includes the app-specific
Track Event shared secret.

The practical control surface intentionally focuses on high-value Engage API
workflows:

- Visitor and account lookup plus custom metadata updates.
- Guide, page, feature, track type, report, and segment discovery.
- Individual guide, page, feature, and track type lookup.
- Public visitor/account report retrieval, with CSV returned as a Slate
  attachment.
- API-created segment creation, update, deletion, visitor patching, and visitor
  export.
- Aggregation queries for analytics use cases.
- Bulk deletion submission and status checks.
- Integration key verification.
- Server-side Track Event creation.

The classic Feedback API, Data Sync credential rotation, Listen feedback
management, and Conversations/agentic events are not exposed here because they
are separate products, admin-only capabilities, or lower-value for the common
Slate agent workflows covered by this integration.

## Authentication

Pendo Engage API requests use an integration key in the
`x-pendo-integration-key` header. Integration keys are created in Pendo under
Settings > Integrations > Integration Keys and can optionally have write access.

Server-side Track Events use a separate app-specific Track Event shared secret.
The shared secret is different from the Engage integration key and is available
from the app details page in Pendo. This integration stores it as an optional
auth output so normal Engage API tools can still run without it.

## Regions

The Engage API base URL follows the Pendo tenant region:

- US: `https://app.pendo.io/api/v1`
- EU: `https://app.eu.pendo.io/api/v1`
- US1: `https://us1.app.pendo.io/api/v1`
- Japan: `https://app.jpn.pendo.io/api/v1`
- Australia: `https://app.au.pendo.io/api/v1`

Track Events use matching data domains:

- US: `https://data.pendo.io/data/track`
- EU: `https://data.eu.pendo.io/data/track`
- US1: `https://us1.data.pendo.io/data/track`
- Japan: `https://data.jpn.pendo.io/data/track`
- Australia: `https://data.au.pendo.io/data/track`

## API Notes

- Page, feature, guide, and track type single-object lookups use query
  parameters such as `/page?id=pageId`, `/feature?id=featureId`,
  `/guide?id=guideId`, and `/tracktype?id=trackTypeId`.
- Page, feature, guide, and track type list endpoints support multi-app filters
  with either `appId` or `expand=*`; tools reject both together.
- Pendo's segment upload API creates API-managed segments from visitor IDs at
  `/segment/upload`. Account IDs are not accepted by that endpoint.
- Segment visitor export is asynchronous: start the export, poll status, then
  retrieve CSV results. CSV results are returned through a Slate attachment.
- Metadata bulk updates use `/metadata/:kind/custom/value?create=true` with the
  documented array body shape.
- Aggregation pipelines must begin with a `source` step.

## Events

Pendo webhooks can notify Slate about events such as guide display, track event
received, NPS survey displayed/submitted, poll displayed/submitted, visitor
created, account created, and visitor email unsubscribe. Webhooks are configured
in Pendo under Settings > Integrations > Webhooks.
