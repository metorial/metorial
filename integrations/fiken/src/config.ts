import { SlateConfig } from 'slates';
import { z } from 'zod';

export let configSchema = z.object({
  defaultCompanySlug: z
    .string()
    .optional()
    .describe('Default Fiken company slug for company-scoped tools.')
});

export type FikenConfig = z.infer<typeof configSchema>;

export let config = SlateConfig.create(configSchema);
