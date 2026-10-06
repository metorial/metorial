# RocketReach

Search people and companies, enrich a selected contact or company, check an asynchronous person lookup, and read your account identity and available credits.

Connect with a RocketReach API key. These tools use the API-key REST API at `https://api.rocketreach.co/api/v2`; RocketReach's separate OAuth-based MCP service is a different connection surface. API access and enrichment entitlement depend on your plan.

The six tools are `search_people`, `lookup_person`, `check_lookup_status`, `search_companies`, `lookup_company`, and `get_account`. Searches return previews; they do not automatically enrich every result. Use the returned `pagination.nextStart` as `start` with the same filters to read another page. Missing pagination values remain unknown.

Person and company enrichment can consume credits and retain account history. Check `get_account` first and approve the intended lookup. Person lookup is asynchronous: reuse its profile ID with `check_lookup_status`, wait between polls, and treat only `complete` as completion. Never repeat enrichment merely to poll. Company Export access can be a separate entitlement. These tools cannot delete retained lookup history or reverse charges.

Existing API-key fields, six tool keys and original input/output fields remain supported. No bulk enrichment, API-key rotation, account administration, email verification or webhook registration is exposed. No downloadable file endpoint is part of these six operations.

Current RocketReach documentation was inaccessible during the October 5, 2026 refresh. The official Python SDK and official MCP plugin establish the retained REST workflows and enrichment effects, but do not establish the HTTP contracts for the newer Universal Credits endpoints. Those endpoints are not inferred or selected automatically. Verify account/API compatibility with RocketReach before using a plan that requires them.
