# Later Influence reporting

Read Later Influence campaign and creator reporting through its documented Reporting API. This integration does not implement Later Social publishing, scheduling or account administration.

Choose **Reporting API v2** for current reporting. An Account Manager must provision the client ID, client secret and authorized instance scope. The token exchange returns a JWT; renewal uses its actual expiry and repeats the credential exchange. No browser authorization or refresh token is involved.

- `list_instances` discovers the authorized instance IDs, without inventing instance names or a user profile.
- `list_campaigns_v2` lists campaign metadata with numeric IDs and nullable publication dates.
- `get_analytics` reads instance summary, time series, campaign, creator, platform, ROI or post analytics. Select the requested metrics except for platform ROI, which has a fixed metric set.

Current lists return one page and `nextCursor`. Keep the same filters, dates, sort and limit when continuing. Dates use UTC `YYYY-MM-DD`, with a two-year maximum reporting range. Platform and content-type filters are mutually exclusive. Unavailable metrics remain `null`; missing time buckets are not filled with zero. Weeks use ISO Monday–Sunday boundaries. Analytics can change as source data arrives.

The original `client_credentials` method and four legacy tool keys remain for existing v1 connections. Connections without an API-version marker stay on v1. `get_instance`, `list_campaigns` and `get_performance_report` are deprecated in favor of current tools. `list_reporting_groups` remains v1-only because Later documents no direct v2 equivalent. Tokens and resource meanings are never translated between versions. Legacy availability must be confirmed with your Account Manager.

Official references: [current API](https://docs.reporting.api.later.com/api-reference), [authentication](https://docs.reporting.api.later.com/authentication), [querying](https://docs.reporting.api.later.com/querying), [migration](https://help-influence.later.com/hc/en-us/articles/20462385592087-Implement-the-Reporting-API-for-Later-Influence).
