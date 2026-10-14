# Diffbot Integration Specification

## Authentication

Connect with a Diffbot API token. Extract, Crawl, Bulk, Knowledge Graph, Enhance,
Natural Language, and Account requests send the token as the API query parameter.
Web Search uses the same token in an Authorization bearer header. Access depends
on the token's plan and available credits.

## Tools

| Key | Capability |
| --- | --- |
| `extract_page` | Extract a public page or supplied HTML/text with automatic or explicit page-type selection. |
| `search_knowledge_graph` | Search with DQL, paginate results, and include selected fields. |
| `enhance_entity` | Match a person or organization from partial identifiers; optionally return a person's employer. |
| `analyze_text` | Extract entities, facts, and sentiment from one text document. |
| `manage_crawl` | Create, list, monitor, pause, resume, restart, delete, and retrieve web crawl results. |
| `manage_bulk_job` | Create, list, monitor, delete, and retrieve bulk URL extraction results. |
| `get_account` | Read account name, email, plan, status, and daily usage without returning credentials. |
| `web_search` | Search the web index with one to five queries and return ranked page URLs and highlights. |

## Request and Result Details

Crawl and Bulk creation use URL-encoded form bodies and default to the Analyze
extraction API when no extraction type is supplied. Job control requests use
GET query flags. Crawl regex inputs map to the provider's regex parameters.
The existing repeatFrequency input supplies the recurrence interval in days;
repeat=0 disables recurrence.

Knowledge Graph and Enhance responses retain their provider match envelope,
including nested entity data and scores, and also expose entity fields at the
record level. An explicit null Enhance entity does not count as a match.
The optional jobStatus output remains a string: it retains a provider string
unchanged, or uses the provider status object's actual message when available.
The optional jobStatusDetails output retains the provider's status object and
code. If no string message exists, jobStatus is omitted.

Natural Language accepts one JSON document in a request array and reads the
first analysis response. Text must contain 1 to 100,000 characters. Crawl and
Bulk results include a downloadable JSON file and retain the existing results
output for compatibility.

## Scope

This integration exposes the tools listed above. Custom extraction API management,
Bulk Enhance, coverage reports, and general-purpose event subscriptions are not
implemented. Crawl/Bulk completion notification URLs remain creation options;
there are no registered event triggers.

## Official References

- [Authentication](https://www.diffbot.com/docs/authentication)
- [Article extraction](https://www.diffbot.com/docs/extract/article)
- [Upload HTML and text](https://www.diffbot.com/docs/extract/extract-raw-html)
- [Knowledge Graph DQL](https://www.diffbot.com/docs/dql/get)
- [Enhance](https://www.diffbot.com/docs/enhance/get)
- [Combine](https://www.diffbot.com/docs/enhance/combine)
- [Natural Language](https://www.diffbot.com/docs/natural-language/process-text)
- [Create a crawl](https://www.diffbot.com/docs/crawl/create)
- [Manage a crawl](https://www.diffbot.com/docs/crawl/manage)
- [Retrieve crawl data](https://www.diffbot.com/docs/crawl/retrieve)
- [Create a bulk job](https://www.diffbot.com/docs/bulk/create)
- [Manage a bulk job](https://www.diffbot.com/docs/bulk/manage)
- [Retrieve bulk data](https://www.diffbot.com/docs/bulk/retrieve)
- [Account API](https://www.diffbot.com/docs/account)
- [Web Search](https://www.diffbot.com/docs/web-search/get)
