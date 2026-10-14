import { z } from 'zod';

export let cmsModelIdSchema = z
  .string()
  .min(1)
  .describe(
    'CMS model identifier. Call list_cms_models to discover model identifiers and field definitions; use the identifier, not the internal table ID.'
  );
