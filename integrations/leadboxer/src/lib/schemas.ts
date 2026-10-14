import { isApiErrorRecord } from 'slates';
import { z } from 'zod';

export let datasetIdSchema = z
  .string()
  .optional()
  .describe(
    'Dataset ID. Call list_datasets to discover accessible dataset IDs. Existing connections can omit this to use their saved dataset; lookups can use the account default.'
  );

export let accountEmailSchema = z
  .string()
  .optional()
  .describe(
    'Email address of the LeadBoxer account that owns the API key. Defaults to the account email saved with the connection.'
  );

export let getLegacyDatasetId = (config: unknown): string | undefined =>
  isApiErrorRecord(config) && typeof config.datasetId === 'string'
    ? config.datasetId
    : undefined;
