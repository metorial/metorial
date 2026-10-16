# Ecologi

## Authentication

The API Key connection sends a Bearer token to the Impact API. The unauthenticated connection supports public reporting. Obtain keys from Integrations → API keys. No account or workspace ID is required in connection configuration.

## Tools

| Key | Provider endpoint | Behavior |
| --- | --- | --- |
| `purchase_trees` | `POST /impact/trees` | Fund global tree planting. |
| `purchase_carbon_offsets` | `POST /impact/carbon` | Fund carbon avoidance in KG or Tonnes. |
| `get_impact` | `GET /users/{username}/impact` or the selected metric endpoint | Read combined or individual impact, including pending amounts. |
| `purchase_local_trees` | `POST /impact/local-trees` | Fund country-specific trees. |
| `purchase_carbon_removal` | `POST /impact/carbon-removal` | Fund permanent removal in kilograms. |
| `purchase_habitat_restoration` | `POST /impact/habitat-restoration` | Fund habitat restoration in square metres. |

Purchasing tools accept optional `fundedByName`, `testMode`, `recipientEmail`, and `idempotencyKey`. Reuse a key only when retrying the same purchase. Funded-by names can appear publicly. Test purchases do not charge, change profiles, or send recipient notifications. Outputs retain provider project details, profile links, costs, and the complete raw response.

Reporting supports `all`, `trees`, `carbon_offset`, `carbon_removal`, and `habitat_restoration`. Carbon reporting uses tonnes; habitat uses square metres. Existing metric values and output names remain available.

No file download, identity, or webhook endpoint is documented in the public API.

## Sources

- [Official API reference](https://docs.ecologi.com/)
- [API and automation overview](https://help.ecologi.com/api-automation-overview)
