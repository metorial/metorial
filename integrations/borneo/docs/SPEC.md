Based on my research, I now have enough information to write the specification. Note that Borneo (borneo.io) is a data security and privacy platform — distinct from the Oracle NoSQL "borneo" Python package. The Pridatect/Borneo GDPR product at pridatect.com also seems related (formerly Pridatect, rebranded to Borneo). I'll focus on the borneo.io data security platform.

# Slates Specification for Borneo

## Overview

Borneo is a data security and privacy platform that provides sensitive data discovery, classification, remediation, and compliance across cloud infrastructure, SaaS applications, and APIs. It is a single platform for discovery, security, governance, and privacy compliance across your data lifecycle. Borneo offers end-to-end data security, covering discovery, privacy, compliance, safe AI, remediation, and governance across multi-cloud environments.

## Authentication

Borneo uses **API Key authentication** for its APIs. To obtain an API Key, navigate to AWS Console → API Gateway → select the relevant API gateway → open API Keys → unmask the API Key. Copy this API Key and use it in every request as the `X-API-KEY` header.

Optionally, multiple API Keys can be created for use between different applications by navigating to the Usage Plans section in the API Gateway and creating additional keys.

The platform also supports **Single Sign-On (SSO)** for dashboard access. Users authenticate securely using Single Sign-On, which leverages zero-trust security principles for enhanced protection.

For dashboard user management via API, users are created with specified roles, organizational access, and authentication settings. Email verification is completed via a token-based flow.

**Note:** Borneo's public API documentation is limited. The exact base URL and full authentication details may vary depending on deployment type (SaaS vs. private deployment). Contact Borneo for deployment-specific API credentials and endpoints.

## Features

### Sensitive Data Discovery and Classification

Scan structured and unstructured data sources across cloud environments and SaaS applications to discover sensitive data including PII, PFI, PHI, API tokens, keys, and credentials. Automatically discover all sensitive data across databases, clouds and SaaS apps, and categorize it with ML-based classifiers to act on them based on their severity score.

- Choose between Surface scans, Audit scans, and in-depth Forensic Scans, designed to provide control over inspection depth and resource efficiency.
- Scans can be configured and scheduled across various cloud resources, supporting both one-time and recurring scans with customization options for resource selection, data inspection policies, and scan limits.
- Custom infotype categories can be created to organize and group related sensitive data types.

### Data Security Posture Management (DSPM)

Get real-time visibility into data exposure, usage, and vulnerabilities while continuously assessing and monitoring your data's security posture.

- Maintain privacy baselines and detect anomalies.
- Global search allows querying across the entire data footprint.

### Data Remediation

Supports data masking, access changes, and encryption — automatically fix data risks by implementing the right security controls.

- Reduce risk surface area by getting timely triggers for automatic anonymization of sensitive data.

### Data Breach Management

Manage and track data breach evaluation records for compliance and risk management purposes.

- Create, retrieve, and delete data breach evaluation records.

### Privacy Compliance and DPIA

Manage personal data responsibly and comply with global privacy regulations (GDPR, CCPA, DPDP, HIPAA) through automated processes, continuous compliance monitoring, and reporting.

- Create Data Protection Impact Assessments (DPIAs) for processing activities, including comprehensive risk assessments for confidentiality, integrity, and availability.
- Export processing activities in specified formats and languages.

### Inventory and Asset Management

Export filtered and sorted lists of inventory resources with customization including field selection, sorting, and filtering based on account, region, resource type, and tags, with options to include violation metrics and framework exception counts.

- Create and manage assets within the platform.

### Organizational Management

Manage organizational entities including:

- **Employees**: Create employee records with personal information, job-related data, and organizational structure for HR systems integration.
- **Departments**: Create departments with translation support.
- **Headquarters**: Register office locations.
- **Domains**: Create domains with polling frequency for automatic polling and management of connected systems or applications.
- **Dashboard Users**: Create users with specified roles and organizational access.

### Legal Document Management

Create and manage legal documents with associated metadata within the platform.

### Recipient Management

Manage discovered data recipients — add discovered recipients as confirmed recipients or archive them.

### Application Data Privacy Management

Borneo Code Analyser analyzes code pull requests and adds intelligent nudges for code reviewers to pay attention to sensitive data handling, identifying code handling sensitive data ahead of production with context for remediation.

- Data Privacy Test Suite pinpoints APIs that are oversharing sensitive data via their responses based on approved data sharing guidelines.

## Events

Based on available documentation, Borneo does not appear to expose a webhook or event subscription API for external consumers. However, the platform supports self-service workflows with customizable notifications and can pipe incident alerts to external tools for quick remediation, integrating with your existing stack for real-time notifications. These notifications appear to be configured within the Borneo dashboard rather than through a programmatic webhook registration API.

The provider does not support a documented, programmatic event/webhook subscription mechanism via its API.
