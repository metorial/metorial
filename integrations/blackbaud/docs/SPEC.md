# Blackbaud integration

This integration exposes Raiser's Edge NXT constituent, gift, action, fundraising, opportunity, and saved-list APIs. It uses OAuth authorization code flow and a developer subscription key. Access and refresh tokens are normalized and rotated during refresh; the subscription key remains attached to the connection.

## Available workflows

- Search, list, retrieve, create, and update constituents and contact details.
- Retrieve first, latest, greatest, and lifetime giving summaries.
- List, retrieve, and create gifts.
- List, retrieve, create, and update constituent actions, including their completion state.
- List and retrieve fundraising opportunities.
- List and retrieve campaigns, funds, and appeals.
- Discover saved constituent, gift, action, and opportunity lists and retrieve records using the matching record type.

The integration does not expose Financial Edge accounting or school APIs. Saved lists default to Constituent when no listType is supplied. A single constituent's action list does not support date, saved-list, or stable-token filters; pagination is applied to its returned collection. Giving-summary API failures propagate to the caller.

## Official references

- [Authorization](https://developer.blackbaud.com/skyapi/docs/authorization)
- [Application scopes](https://developer.blackbaud.com/skyapi/docs/applications/scopes)
- [Constituent API](https://developer.sky.blackbaud.com/docs/services/56b76470069a0509c8f1c5b3)
- [Gift API](https://developer.sky.blackbaud.com/docs/services/58bdd5edd7dcde06046081d6)
- [Fundraising API](https://developer.sky.blackbaud.com/docs/services/58bdd6c8d7dcde06046081d7)
- [Opportunity API](https://developer.sky.blackbaud.com/docs/services/58e3b2597c1af25c58b9c4e3)
- [Saved lists](https://developer.sky.blackbaud.com/docs/services/list/operations/GetLists)
