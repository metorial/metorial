# InVision

Legacy tools for InVision Design System Manager (DSM) design-token reads and Enterprise SCIM user provisioning. InVision discontinued its design products, including DSM and Prototype, effective December 31, 2024. These tools preserve existing connection contracts; they do not establish that the retired service is available.

The seven tools retrieve JSON design tokens, prepare downloadable token stylesheets, and list, retrieve, provision, update, deactivate, or delete SCIM users. DSM tools use a DSM API key and the export base URL from the design system's API setup page. SCIM tools use the separate Enterprise provisioning bearer token and the SCIM URL ending in `/scim/v2`. Do not include credentials, query parameters, or a fragment in either base URL.

SCIM list pagination uses a 1-based `startIndex`; `count: 0` requests result metadata. User updates send only the supplied attributes. Returned user profiles include stable user IDs and normalize absent optional name, email, and active values. Style files are downloadable and retain the existing `styleContent` string response for compatibility.

Provider authentication and API acceptance have not been verified. The historical InVision API documentation is unavailable, and no additional endpoints are assumed.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
