# <img src="logo.svg" height="20"> Tavily

Search the web, extract selected pages, and traverse websites with explicit depth, breadth and result limits. Create asynchronous research requests, resume their native status and download completed reports as Markdown or JSON. Read API-key credits separately from account plan usage. Content operations can consume credits and retain provider history; a returned request ID supports reconciliation without recreating an accepted job.

Seven tools cover search, extract, crawl, map, research creation, exact research status/report retrieval and usage. The API key is sent only to `https://api.tavily.com`; optional project configuration scopes the usage query. Country boosting uses native lowercase country names. Mapping and crawling return bounded results without a completeness or cursor guarantee.

Research creation can wait for up to five minutes or return immediately. A polling failure returns the accepted request ID; resume it rather than blindly recreating the job. There is no documented cancel/delete route. Downloading requires completed status; structured reports use JSON.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

Usage summaries distinguish the native API-key budget from the account plan and pay-as-you-go totals. An explicit search result maximum is verified on return; a refusal after dispatch does not restore credits. Crawl/map limits count links processed and are not asserted as hard response-array caps.
