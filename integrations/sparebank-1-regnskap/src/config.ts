import { SlateConfig } from 'slates';
import { z } from 'zod';

export let configSchema = z.object({
  companyKey: z
    .string()
    .optional()
    .describe('Default Unimicro CompanyKey for company-scoped SpareBank 1 Regnskap API calls.')
});

export type SpareBankRegnskapConfig = z.infer<typeof configSchema>;

export let config = SlateConfig.create(configSchema);
