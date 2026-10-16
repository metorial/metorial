# PassSlot integration

## Authentication

Use a PassSlot App Key from the dashboard. Requests use HTTPS at `https://api.passslot.com/v1`, with the key as the HTTP Basic username and an empty password. App Keys can be restricted to templates or pass type IDs; scanner operations require full access. Wallet file downloads use the documented alternative of placing the App Key directly in the Authorization header. No OAuth token refresh or connection configuration is required.

## Supported tools

| Tool | Behavior |
| --- | --- |
| `list_templates` | List template metadata, placeholders, and pass descriptions. |
| `get_template` | Read a template and its distribution link. |
| `create_template` | Create a template using a pass type identifier and pass description. |
| `update_template` | Update a template description, name, pass type, actions, branding, restrictions, or payment settings. |
| `delete_template` | Delete a template. |
| `generate_pass` | Generate a pass by template ID or name, returning a downloadable `.pkpass` file and distribution link. Template ID takes precedence if both are supplied. |
| `download_pass` | Download an existing signed `.pkpass` file and retrieve its distribution link. |
| `list_passes` | List all passes or filter by pass type identifier. |
| `get_pass` | Read distribution link, placeholder values, status, and full pass JSON. Provider failures are reported. |
| `update_pass` | Update placeholder values or status, or explicitly send a push notification. |
| `delete_pass` | Delete a pass. |
| `email_pass` | Send a pass to a recipient email address. |
| `list_pass_types` | Discover pass type identifiers and certificate metadata. |
| `get_template_settings` | Read template actions or distribution restrictions before editing them. |
| `list_scanners` | List scanner IDs, types, and template permissions. |
| `get_scanner` | Read full scanner configuration, including authorization details or PIN. |
| `manage_scanner` | Create, update, or delete a scanner. |

## Behavior notes

- Use `list_templates`, `list_passes`, `list_pass_types`, and `list_scanners` to discover resource identifiers. Lists return complete provider arrays; the documented endpoints expose no pagination parameters.
- Template updates send a complete template object, preserving the current name, pass type, and description when those fields are omitted. Description objects replace the description; include every description field that should remain.
- Actions and restrictions use their dedicated endpoints. Restrictions replace the previous restriction set: omitted restriction properties disable those restrictions, and an empty object clears them.
- Branding settings accept text and colors. Footer image upload and removal use a separate provider API and are not exposed here. Branding may require an account upgrade.
- Payment settings require the Professional plan. Provider values are case sensitive: `PayPalNVP`, `Stripe`, or `PAYMILL`. PayPalNVP requires `username`, `password`, and `signature`; Stripe requires `publishableKey` and `secretKey`; PAYMILL requires `publicKey` and `privateKey` in `providerSettings`.
- Pass status values are `valid`, `invalid`, `redeemed`, `unpaid`, `locked`, and `incomplete`. Status changes alone do not send push notifications. Value updates normally send notifications automatically; request manual push only when needed.
- Scanner types are `PassVerifier` or `Browser` and can only be set during creation. Scanner updates support name, fullAccess, and allowedTemplates. Supply allowedTemplates whenever explicitly setting fullAccess to false.
- Multi-section updates execute sequentially. A later provider error can occur after earlier sections were applied; read the current state before retrying.

## Scope

Pass-specific images, template image upload/removal, custom pass pricing, branding footer images, and webhook subscriptions are not exposed as tools. No suitable account/profile identity endpoint is listed in the official REST resources.

## Official references

- [Authentication and error codes](https://www.passslot.com/developer/api/start)
- [REST resources](https://www.passslot.com/developer/api/resources)
- [Template updates](https://www.passslot.com/developer/api/resources/updateTemplate)
- [Pass generation](https://www.passslot.com/developer/api/resources/createPassFromTemplate)
- [Pass downloads](https://www.passslot.com/developer/api/resources/showPass)
- [Pass status updates](https://www.passslot.com/developer/api/resources/updatePassStatus)
- [Scanner updates](https://www.passslot.com/developer/api/resources/updateScanner)
