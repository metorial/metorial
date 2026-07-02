The search results are showing many generic identity verification providers but the specific one called "IdentityCheck" appears to be from StackGo. Let me get more details.Now let me get the API documentation details.Now I have enough information to write the specification. Based on my research, IdentityCheck by StackGo is a KYC identity verification platform. Let me compile the specification.

# Slates Specification for Identitycheck

## Overview

IdentityCheck by StackGo is a KYC (Know Your Customer) identity verification platform that verifies individuals using government-issued identity documents and biometric selfies. It accepts over 10,000 document types from over 200 countries, including passports, driver's licences, ID cards, and residency permits. It also provides compliance-ready KYC, AML, and risk screening, integrating directly into CRM and business software platforms like HubSpot, Salesforce, Pipedrive, and others.

## Authentication

IdentityCheck uses API key authentication. Users generate API keys within the IdentityCheck dashboard for integration purposes. The API and webhooks functionality is available on the Professional plan and above.

To authenticate:

1. Sign up for an IdentityCheck account at `identity.stackgo.io/signup`.
2. Navigate to account settings within the IdentityCheck dashboard.
3. Generate an API key for your integration.
4. Use the API key in your requests to authenticate against the IdentityCheck API.

API documentation is hosted at `docs.stackgo.io`.

IdentityCheck also supports a **Bring Your Own Key (BYOK)** model, where you can manage your own encryption keys and choose the ID verification and AML providers that best suit your business needs.

## Features

### Identity Verification (KYC)

IdentityCheck emails the contact a unique URL, which they click to commence the KYC process. The contact takes a picture of their government-issued documents and a selfie. The images are used to determine if the identity is valid, and the result is written back to the contact record inside your CRM.

- Supports biometric verification (document + selfie) or document-only verification.
- Over 1,000 data points are analysed through device and network fingerprinting, with average decision time of 6 seconds.
- Individuals receive an Identity Certificate after verification, which can be reused for future verifications.

### AML Screening

After identity verification, IdentityCheck extracts the full legal name and date of birth from the ID document and automatically screens those details for PEP/Sanctions and Adverse Media as required. Potential matches are notified via the CRM with a link to the details.

- Includes PEP (Politically Exposed Person) screening, sanctions screening, and adverse media screening.
- Screenings can be run individually or as a combined AML check.

### Proof of Address

Verification of an individual's proof of address, available as an add-on check.

### Background Checks (US)

US criminal background checks are available as an additional check type.

### Credit Reports and Scoring

Credit reports, credit scores, and credit risk alerts can be obtained for individuals as part of the verification workflow.

### Know Your Business (KYB)

- Global KYB reports are available for business entity verification.
- UBO (Ultimate Beneficial Owner) reports are available for Australian entities.
- ASIC Director Reports (on file or refreshed) for Australian companies.

### CRM and SaaS Integrations

IdentityCheck verifies identity of contacts inside your CRM. The integration reads contact information, verifies the identity, and writes back the verification outcome. A privacy layer ensures PII is not stored inside the CRM.

- Native integrations with HubSpot, Pipedrive, Karbon, XPM, FYI Docs, Zoho, and others.
- Also integrates with automation platforms like Zapier and Make.
- Supports field writeback (verification results written back to CRM fields) and PDF report writeback.
- Branded ID check request emails with configurable reminders.

### Custom Onboarding Forms

- Templated onboarding forms on standard plans; custom forms on the Business plan.
- The integration reads contact information, verifies the identity, and writes back the verification outcome. PII is not stored inside the CRM; only admins can access PII through MFA-authenticated login.

### Bring Your Own Key (BYOK)

Users can choose the ID verification and AML providers that best suit their business needs, negotiate directly with suppliers, and connect their preferred identity verification provider via StackGo's low-code automation.

## Events

IdentityCheck supports API and webhooks on Professional and Business plans.

### Verification Completion

When an identity verification check is completed, a webhook notification is sent with the verification outcome (positive or negative). This allows your backend system to react in real time to completed identity checks without polling.

### CRM Field Writeback Events

Verification results, statuses, and report links are written back to the connected CRM automatically upon completion. This is the primary mechanism for receiving results in CRM-based integration workflows.
