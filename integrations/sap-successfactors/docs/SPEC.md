# SAP SuccessFactors OData V2 contract

This integration offers sixteen tools for authorized OData V2 reads, runtime metadata discovery, bearer-token validation, scalar inserts/merges and explicit workflow-aware absence submission. Tool coverage, authentication modes, pagination, effective dating and compatibility limits are described in [README](../README.md).

Requests use the published company API-server origin, HTTPS, bearer authentication, fixed OData V2 resource paths, bounded timeouts and no redirects. Company ID is required by the SAML token exchange and is stored with authentication; it is not duplicated in configuration. `/oauth/validate` does not return a person/company identity.

Entity keys and scalar write fields are interpreted using runtime EDM metadata. String apostrophes are doubled and encoded; Int64 and decimal values preserve exact strings; compound keys require every named key. Updates use POST with `X-HTTP-METHOD: MERGE`, not OData V4 PATCH. Unsupported Insert is not substituted with Upsert. A readback must bind exact keys and every requested field before success is reported.

Collections expose provider count and continuation metadata. Continuations must remain on the same origin and entity with documented query parameters; credentials, arbitrary paths and redirect hosts are rejected. Optional effective-date parameters follow SAP’s current-day default and explicit range semantics.

Downloads provide the authenticated metadata endpoint and a structured capability summary. Token expiry is handled by connection renewal; the metadata endpoint itself is stable. Provider messages, transport errors and diagnostic parents are not returned. Ordinary responses remove credential fields and internal OData transport metadata while preserving requested business fields.

SAP module configuration, role-based permissions, target population, IP restrictions, required custom fields and entity-specific operations remain provider-controlled. Metadata flags advertise operations, not granted user permissions. Legacy entity-name incompatibilities produce actionable discovery guidance rather than guessed replacements.

## Official references

- [OData V2 reference, current 1H 2605 PDF](https://help.sap.com/doc/a7c08a422cc14e1eaaffee83610a981d/2605/en-US/SF_HCM_OData_API_DEV.pdf)
- [Published API servers](https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/list-of-sap-successfactors-api-servers)
- [SAML assertions](https://help.sap.com/docs/successfactors-platform/sap-successfactors-hcm-suite-sfapi-developer-guide/generating-saml-assertion)
- [Metadata retrieval](https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/d599f15995d348a1b45ba5603e2aba9b/retrieving-metadata)
- [Entity operations](https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/operations)
- [Merge](https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/merge)
- [EmployeeTime](https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/d599f15995d348a1b45ba5603e2aba9b/a1905d4d4b26469b9ebca160ca34814c.html)
