# LinkedIn Ads API coverage

Reviewed against the official Marketing API documentation on 2026-10-05. Requests use version 202609, Rest.li 2.0 and OAuth Bearer authentication.

| Capability | Tools | Contract |
| --- | --- | --- |
| Connected member | get_current_user | OpenID Connect userinfo; actual member subject |
| Accounts | list_ad_accounts, get_ad_account | Authorized discovery, exact ID and test flag |
| Campaign groups | list_campaign_groups, get_campaign_group, create_campaign_group, update_campaign_group | Account-scoped REST, cursor paging, partial updates |
| Campaigns | list_campaigns, get_campaign, create_campaign, update_campaign | Account-scoped REST, required current creation fields, explicit political declaration |
| Creatives | list_creatives, get_creative, create_creative, update_creative | Criteria finder, existing content references, editable name/status |
| Reporting | get_ad_analytics | Resource URN lists and structured inclusive provider dates; exclusive public end date |
| Conversions | list_conversion_rules, create_conversion_rule, send_conversion_events | Offset paging, conversion IDs, accepted batch events |
| Sponsored leads | list_lead_forms, get_lead_form_responses | Owner union, form versions, time range and test-lead filters, offset paging |

Advertising writes need rw_ads; reads accept r_ads or rw_ads. Reporting needs r_ads_reporting. Conversions require rw_conversions and separate product approval. Lead Sync requires r_marketing_leadgen_automation and separate approval. Connections request only their declared product scopes plus OpenID Connect identity scopes.

Legacy tool keys, field types and defaults are preserved. New fields are optional. Numeric campaign and group identifiers retain their numeric output types and refuse inexact upstream numbers. Lead discovery adds exactLeadForms for every form and legacyNumericIdOmissionCount; the original required numeric leadForms IDs remain present only where precise. JSON.parse reviver-source support is checked before Lead Sync dispatch; unsupported runtimes fail clearly. Exact response selectors preserve large ID digits. Creative IDs remain complete URNs. Current APIs require an explicit ad account for hierarchical routes; an omitted legacy account selector performs bounded authorized discovery and refuses missing or ambiguous matches.

Campaign creation keeps locale, targeting and offsite delivery optional at the schema level for compatibility, but explains the provider's required fields before making an invalid write. Sponsored Content and Dynamic campaigns require an explicit associatedEntity. Current creative content replacement is unsupported and produces remediation instead of silently dropping the field. Test status is inherited from the parent account and cannot be set independently.

Conversion batches are limited to 5,000 events. Acceptance does not prove eventual attribution; no job endpoint is invented. A disabled conversion rule may remain retained after cleanup because the documented lifecycle is disabling, not a guaranteed delete. Lead form numeric/unversioned selectors select the current version; a complete versioned form URN selects that exact version.

## Official references

- [Version lifecycle](https://learn.microsoft.com/en-us/linkedin/marketing/versioning?view=li-lms-2026-09)
- [Accounts and test accounts](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-accounts?view=li-lms-2026-09)
- [Campaign groups](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-campaign-groups?view=li-lms-2026-09)
- [Campaigns](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-campaigns?view=li-lms-2026-09)
- [Creatives](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-creatives?view=li-lms-2026-09)
- [Reporting](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting?view=li-lms-2026-09)
- [Conversions API](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api?view=li-lms-2026-09)
- [Conversion-rule lifecycle](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversion-tracking?view=li-lms-2026-09)
- [Lead Sync](https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync?view=li-lms-2026-09)
- [Lead schema](https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/lead-sync-schema?view=li-lms-2026-09)
- [OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Approved-partner refresh](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens)
