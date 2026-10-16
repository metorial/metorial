# Kaggle Specification

Kaggle hosts competitions, datasets, notebooks, and machine learning models. This integration uses the documented REST API v1 compatibility surface at `https://www.kaggle.com/api/v1`.

## Authentication

Use HTTP Basic authentication with a Kaggle username and a legacy API key. At [Kaggle API settings](https://www.kaggle.com/settings/api), create credentials under **Legacy API Credentials**. The downloaded `kaggle.json` contains `username` and `key`. New personal API tokens and OAuth tokens use a separate authentication flow and do not belong in the legacy API key field.

## Tools

- `search_competitions`: filter competitions by keyword, category, group, sort order, and page.
- `get_competition_details`: list competition files, optionally retrieve leaderboard entries and your submissions. File pagination tokens and submission pages can be provided explicitly.
- `download_competition_data`: download a competition archive or one named file. Competition rules must already be accepted.
- `search_datasets`: filter datasets by keyword, owner, group, file type, license, tags, size, and page.
- `get_dataset_details`: retrieve metadata and a page of files for a dataset version, optionally retrieve processing status.
- `download_dataset`: download a dataset ZIP archive or one named file, optionally selecting a version.
- `create_dataset`: create a dataset or publish a new version from existing Kaggle upload tokens. New datasets require a title. Version creation requires owner, dataset slug, and version notes. `newDatasetSlug` names a new dataset; `datasetSlug` selects an existing dataset for version creation.
- `search_kernels`: search notebooks by keyword, author, language, type, output type, data source, page, and page size.
- `get_kernel_details`: retrieve notebook source and metadata, optionally retrieve output-file metadata and run status. Source and output retain the original provider records.
- `push_kernel`: create or update and execute a notebook; attach dataset, competition, notebook, and model data sources. Execution is asynchronous.
- `search_models`: list models with keyword, owner, sort order, page size, and continuation token.
- `get_model_details`: retrieve a model and optionally one variation, using both framework and variation slug.
- `download_model_version`: download a specific model variation version as a tar.gz archive.
- `manage_model`: create, update, or delete a model. Creation requires a title; updates require at least one changed field.
- `manage_model_variation`: create, update, or delete a variation, or create/delete versions. Creation requires an instance slug and license. Version creation requires existing upload tokens; version deletion requires a positive version number.

Typed summaries omit null optional fields and retain original provider records in additive `raw` fields. Missing required search-result references or titles fail clearly. Failed upstream operations are surfaced as errors; requested detail operations do not silently return empty success results.

Downloads use authenticated provider download endpoints. Metadata checks establish resource visibility but do not establish that a later download will succeed; permissions, accepted competition rules, file names, and selected versions are checked by Kaggle when downloading.

## Scope

Upload initialization, prediction submission, notebook deletion, OAuth authorization, personal token auth, and local CLI configuration are not exposed. The legacy REST API does not document a suitable self/profile endpoint for this credential flow. No events or webhooks are exposed.

## Official references

- [Kaggle API documentation](https://www.kaggle.com/docs/api)
- [Official Kaggle CLI documentation](https://github.com/Kaggle/kaggle-cli/blob/main/docs/README.md)
- [Official REST v1 route definitions](https://github.com/Kaggle/kaggle-cli/blob/1.6.3/kaggle/api/kaggle_api.py)
- [Current official CLI operations](https://github.com/Kaggle/kaggle-cli/blob/main/src/kaggle/api/kaggle_api_extended.py)
