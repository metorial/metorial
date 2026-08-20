import { configV2, type InferSlateConfig } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    defaultCompanySlug: {
      schema: z
        .string()
        .optional()
        .describe('Default Fiken company slug for company-scoped tools.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

export type FikenConfig = InferSlateConfig<typeof config>;
