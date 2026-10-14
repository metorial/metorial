# <img src="logo.png" height="20"> Hyperise

Identify the connected user account and create and manage dynamically personalized images, videos, and website content tailored to individual recipients. List and manage image templates with dynamic text, image, and QR code layers. Create, read, update, and delete prospect business data records for personalization, including custom text fields. Generate personalized short links with Open Graph metadata and dynamic image previews. Enrich contact data from email addresses, resolving profile images, company logos, website screenshots, and business details. Track personalized image impressions and views filtered by template and date range. Provision client sub-accounts with seat allocations and email invitations for agency operations.

## Tools

- `get_current_user` identifies the user connected by the API token.
- `list_image_templates` discovers active templates and their preview images.
- `create_prospect`, `get_prospect`, `list_prospects`, `update_prospect`, and `delete_prospect` manage business prospect records.
- `create_short_link` creates personalized links with image previews.
- `enrich_data` enriches contacts from email addresses. Supply `imageTemplateHash` from `list_image_templates`; the provider documents it as required.
- `list_image_impressions` tracks views. Without `dateFrom`, Hyperise returns views since the previous API call.
- `create_client_organization` provisions a client organization with an explicit seat allocation on Agency or White Label plans.
- `create_client_account` remains available for existing workflows and is deprecated in favor of `create_client_organization`.

See the [Hyperise API help center](https://hyperise.customerly.help/en/collections/4317-api) for the documented operations and plan requirements.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
