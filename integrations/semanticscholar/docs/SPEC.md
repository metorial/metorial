Let me get more details on the API endpoints and features.Now let me check for webhook/event support and get details on the API key header format.I now have enough information to write the specification.

# Slates Specification for Semantic Scholar

## Overview

Semantic Scholar is a free, AI-powered academic search engine developed by the Allen Institute for AI (AI2) that indexes over 200 million scientific papers across all disciplines. The API allows users to find and explore scientific publication data about authors, papers, citations, venues, and more. It provides structured JSON data including metadata, abstracts, citation networks, TLDR summaries, and SPECTER2 embeddings.

## Authentication

Most Semantic Scholar endpoints are available to the public without authentication. Certain endpoints require authentication via an API key, and authenticated users have access to higher rate limits.

**API Key Authentication:**

- Request a free API key through the Semantic Scholar website at `https://www.semanticscholar.org/product/api#api-key-form`.
- You will receive your private API key via email.
- The API key is passed via the `x-api-key` request header, e.g., `headers = {"x-api-key": "your-api-key"}`.
- Some endpoints (such as the Datasets diffs endpoint) require the use of a Semantic Scholar API key.

No OAuth or other authentication methods are supported. The API uses only API key-based authentication.

## Features

### Paper Search

Search for academic papers using keyword queries. Two search modes are available: paper relevance search and paper bulk search. The relevance search can return more detailed information about each paper's authors, references, and citations, while the bulk search supports sorting and special syntax in the query parameter.

- Filter results by year, publication date range, publication type, fields of study, venue, minimum citation count, and open access PDF availability.
- Use the `fields` parameter to specify which paper metadata to return (e.g., title, abstract, authors, citation count, references, TLDR, embeddings, open access PDF URL).

### Paper Details

Retrieve detailed metadata for individual papers or batches of papers. Papers can be looked up by various identifier types: Semantic Scholar Paper ID (S2PaperId), CorpusId, DOI, ArXiv ID, MAG, ACL, PMID, PMCID, or URL.

- Available fields include title, abstract, authors, year, venue, citation count, reference count, influential citation count, TLDR summary, publication venue details, external IDs, open access PDF links, and SPECTER2 embeddings.

### Citation and Reference Graph

Explore the citation network surrounding a paper. Retrieve the list of papers that cite a given paper (citations) and the list of papers referenced by a given paper (references).

- Useful for analyzing a paper's sources or investigating connections between academic works. Note that references are outgoing (papers cited by the specified paper) while citations are incoming (papers that cite the specified paper).
- Each citation/reference includes context and metadata about the citing/cited paper.

### Author Lookup

Retrieve information about researchers, including their publication history. Look up individual authors by their Semantic Scholar Author ID, or fetch details for multiple authors in batch.

- Available fields include name, affiliations, homepage, paper count, citation count, h-index, and list of papers.
- Retrieve the full list of papers by a specific author.

### Paper Autocomplete

Get autocomplete suggestions for a paper query. Useful for building search interfaces with type-ahead functionality.

### Paper Recommendations

Get recommended papers for a single positive example, with an option to choose which pool of papers to recommend from: "recent" or "all-cs".

- Get recommended papers for lists of positive and negative examples, where negative paper IDs indicate papers the returned results should not be related to.

### Dataset Downloads

For heavy-duty users, the Datasets API provides download links for the entire Semantic Scholar Academic Graph (S2AG) or the Open Research Corpus (S2ORC), enabling offline, large-scale research.

- List available dataset releases and retrieve download links for specific datasets within a release.
- Retrieve incremental diffs between releases, containing only the changes from one release to the next sequential release. This allows maintaining a local copy of the dataset without re-downloading everything.
- Dataset diffs endpoints require an API key.

## Events

The provider does not support events. Semantic Scholar does not offer webhooks, event subscriptions, or purpose-built polling mechanisms through its API.
