# Softr API contract

Seventeen tools retain every legacy key and input, add native table-view discovery and app-user activate/deactivate lifecycle, and use current documented Studio and Database endpoints. See the README for setup, exact discovery, native paging/filtering, sensitive sign-in links, accepted versus confirmed user state, destructive/retained effects and bounded JSON downloads.

- Studio base: https://studio-api.softr.io/v1/api
- Database base: https://tables-api.softr.io/api/v1
- User JWT validation: the selected published HTTPS app hostname, without PAT forwarding.
- Authentication: scoped Personal Access Token in Softr-Api-Key; Studio also uses Softr-Domain. Current tokens have selected permissions and expiration; no OAuth refresh or current-user identity endpoint is documented.

Current field writes document name, type and options. Unsupported retained write parameters fail locally with guidance. Record search uses filter.condition native leftSide/rightSide/bounds/conditions, sorting and paging. Detailed database/table/view collection schemas do not expose paging parameters; the implementation refuses local oversize or visibly incomplete collections rather than inventing pagination or absence.

User operations expose accepted/unconfirmed state because the published contract provides no independent user-state observer. Deactivation retains the user record. Native database/table/field/record deletion requires 204 and exact RESOURCE_NOT_FOUND readback with remaining parent/inventory access; this is not history erasure.

The optional JSON download represents only the returned record/page, within 8 MiB and 200 records. There is no native export job, attachment-field byte download or invented signed-link renewal. Magic sign-in URLs are intentionally sensitive outputs; expiry is not guessed.

Official sources: [API setup and user endpoints](https://docs.softr.io/softr-api/api-setup-and-endpoints), [Database API](https://docs.softr.io/softr-api/softr-database-api/index.md), [OpenAPI](https://docs.softr.io/openapi.yaml), [Search](https://docs.softr.io/softr-api/softr-database-api/records/search-records.md), [Views](https://docs.softr.io/softr-api/softr-database-api/tables/get-table-views.md).

The active private suite covers all registered keys, authorized reads and exact native comparisons. Unsafe effects remain blocked before mutations where complete ownership/association/rollback observers are unavailable. Missing local profiles do not disable the suite or establish provider retirement.
