I notice the search results are conflating two different products: **InVision** (the design platform by InVisionApp, invisionapp.com) and **Invision Community** (a community forum platform by IPS, invisioncommunity.com). Let me clarify which one is intended and research InVision (the design platform) specifically.Based on my research, it's clear that InVision (invisionapp.com), the design collaboration platform, **shut down permanently on December 31, 2024**. The platform no longer exists and its APIs are no longer available. This is a critical finding that must be reflected in the specification.

# Slates Specification for InVision

## Overview

InVision was a digital product design platform founded in 2011 that provided interactive prototyping, design collaboration, and design system management (DSM) tools. The company discontinued all its design collaboration services (including prototypes, DSM, etc.) at the end of 2024. The last day of access was December 31, 2024, after which all accounts and data were permanently deleted.

**⚠️ InVision is no longer operational. Its services were permanently shut down on December 31, 2024. No API integration is possible.**

## Authentication

InVision's APIs are no longer available. Prior to shutdown, the platform offered limited API access:

- **Design Tokens & Icons API (DSM):** Required an authentication key generated from the API setup page within the DSM design system settings. Keys could be managed and revoked from the API Authentication section.
- **SCIM Provisioning (Enterprise only):** Used a bearer token displayed only once when an Enterprise owner or admin initially enabled SCIM provisioning. This was used for user provisioning with identity providers like Okta.

InVision never offered a general-purpose public REST API for managing prototypes, projects, or core platform resources. A general API for user management and platform operations was a tracked feature request that was never fulfilled.

## Features

**Note: All features below are defunct as of December 31, 2024.**

### Design Tokens & Icons API (DSM)

- Allowed programmatic retrieval of design tokens (colors, typography, spacing, etc.) and icons from an InVision DSM design system.
- Could be used with tools like Style Dictionary to generate style files for different platforms.
- Was read-only; tokens and icons were managed through the DSM interface, not via the API.
- Required specifying a design system version to access version-specific token data.

### SCIM User Provisioning

- Supported SCIM-based user provisioning for Enterprise accounts, enabling automated user lifecycle management through identity providers.
- Integrated with identity providers like Okta for automated user creation, updates, and deactivation.
- Only available on Enterprise plans.

### Freehand (Acquired by Miro)

- InVision's visual collaboration product, Freehand, was acquired by Miro in the fall of 2023.
- Freehand functionality has been migrated to Miro's platform.

## Events

The provider does not support events. InVision never provided webhooks or event subscription mechanisms through its APIs. The platform has been permanently shut down as of December 31, 2024.
