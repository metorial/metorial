# Semantic Scholar

The integration exposes read-only Academic Graph, Recommendations, and Datasets APIs. Its contracts follow the provider’s [Academic Graph](https://api.semanticscholar.org/api-docs/graph), [Recommendations](https://api.semanticscholar.org/api-docs/recommendations), and [Datasets](https://api.semanticscholar.org/api-docs/datasets) documentation.

## Authentication and setup

Public access remains available without credentials. The optional `api_key` method accepts `apiKey` and stores it as `token`; API requests send it in the case-sensitive `x-api-key` header. There are no setup fields, OAuth scopes, refresh tokens, account identity endpoint, or webhook subscriptions in the documented APIs.

## Academic Graph

- `search_papers`: relevance-ranked keyword search with paper metadata selection and publication, venue, citation, discipline, and public-PDF filters. At most 100 papers per page and 1,000 results overall.
- `search_papers_bulk`: filtered Boolean search with sorting and continuation tokens. Up to 1,000 papers per page and 10,000,000 overall; nested citation/reference metadata is unavailable.
- `match_paper`: closest title match, including the provider’s score. No match is a provider error.
- `get_paper`: a single paper or a batch of up to 500 IDs. Null batch entries remain null. Supports the provider’s external identifier prefixes and requested metadata fields. Request `embedding.specter_v2` for SPECTER version 2.
- `get_citations`: incoming citations or outgoing references, with pagination and requested contextual fields.
- `search_authors`, `get_author`, `get_author_papers`, and `get_paper_authors`: researcher discovery, single/batch profiles, and paginated publications or paper authors. Author batch lookup accepts up to 1,000 IDs.
- `autocomplete_papers`: provider suggestions for a partial query; the provider truncates the query after 100 characters.
- `search_snippets`: ranked excerpts from titles, abstracts, and body text with original paper, retrieval, and license metadata. Supports documented filters and at most 1,000 results.

Existing numeric schema fields remain numbers; integer limits are checked at runtime. Malformed responses fail explicitly rather than inventing totals or empty result arrays. Missing metadata remains missing, and provider records retain additional fields.

## Recommendations

`recommend_papers` uses one positive paper for single-paper recommendations or a list of positive and optional negative examples. The `recent` and `all-cs` pools apply only to the single-paper mode without negatives. Up to 500 recommendations are supported.

## Datasets and downloadable files

`get_datasets` lists releases, reads release contents, or returns one dataset’s metadata and complete original file URL list. The provider’s actual release identifier is `release_id`; the legacy `releaseId` output field remains available if supplied by the provider.

File preparation is optional and limited to one selected shard. Pass `releaseId`, `datasetName`, and a `downloadFileUrl` from a previous result. If `latest` is selected, preparation resolves it to an immutable dated release before retrieving that release’s dataset links. Preparation requires HTTPS on the dataset host shown by official documentation, `ai2-s2ag.s3.amazonaws.com`, and a known future signed expiry. The file URL keeps its signature; the API key is never forwarded to S3.

Renewal reads the same dated release and dataset, finds the same exact S3 object path regardless of list order, and fails if it is missing or ambiguous. Expiry comes from the S3 `Expires` or `X-Amz-Date`/`X-Amz-Expires` fields, with a local 60-second renewal safety margin. No provider lifetime is assumed. Metadata discovery does not prepare any files. Large-shard transfer, storage limits, later signed-link availability, and completed delivery remain outside what preparation establishes.

Incremental dataset diffs are documented upstream but are not currently exposed. No data files are downloaded during metadata or preparation calls.
