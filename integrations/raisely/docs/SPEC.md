# Raisely integration

The integration uses Raisely API v3 at `https://api.raisely.com/v3` with a campaign private key in the `Authorization: Bearer` header. No organization or campaign identifier is required during connection setup. Discover campaigns with `list_campaigns` and pass their UUIDs to campaign-scoped tools.

## Available tools

| Area | Tools |
| --- | --- |
| Connected account | `get_current_user` |
| Campaigns | `list_campaigns`, `get_campaign` |
| Fundraising profiles | `list_profiles`, `get_profile`, `manage_profile` |
| Donations | `list_donations`, `get_donation`, `create_donation` |
| Recurring giving | `list_subscriptions`, `get_subscription`, `manage_subscription` |
| Supporters | `list_users`, `upsert_user` |
| Campaign products | `list_products` |
| Profile posts | `manage_post` |
| Campaign messages | `send_message` |

List tools expose optional limit and offset inputs and return provider pagination where supplied. `includePrivateData` requests private/custom fields where supported and permitted. The identity tool returns an explicit selection of user identity and token privilege fields, excluding credentials and arbitrary custom fields.

Supporter upsert sends the campaign as the required query parameter. Existing interaction text is sent as `interaction.detail.comment`; tags remain UUIDs or paths. Custom field inputs are public values, as in earlier releases.

## Compatibility and limits

Existing tool keys, input/output types, enums, and field optionalness are preserved. Some legacy routes and fields have no exact match in the current public reference: campaign-scoped profile/donation/subscription/post creation, campaign messaging, member removal, and some profile/user filters. They remain available with their existing semantics and need authenticated verification. The reference documents subscription scheduling with `count` and `interval`, while the existing management tool retains its `frequency` input and payload for compatibility.

Product ordering, media uploads/downloads, and webhook triggers are not exposed. No credentials or live provider calls were used during the October 2026 documentation audit.

## Official sources

- [Authentication](https://developers.raisely.com/docs/authentication-1)
- [API reference](https://developers.raisely.com/reference)
- [Connected account](https://developers.raisely.com/reference/getauthenticate)
- [Supporter upsert](https://developers.raisely.com/reference/postusersupsert)
- [Subscription creation](https://developers.raisely.com/reference/postsubscriptions)
- [Subscription update](https://developers.raisely.com/reference/patchsubscription)
- [Custom message events](https://developers.raisely.com/docs/sending-a-custom-message)
