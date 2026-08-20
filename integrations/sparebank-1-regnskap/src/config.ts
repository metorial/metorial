import { configV2 } from 'slates';
import { z } from 'zod';

export let configSchema = z.object({
  companyKey: z
    .string()
    .optional()
    .describe('Default Unimicro CompanyKey for company-scoped SpareBank 1 Regnskap API calls.')
});

export type SpareBankRegnskapConfig = z.infer<typeof configSchema>;

export let config = configV2({
  fields: {
    companyKey: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default Unimicro CompanyKey for company-scoped SpareBank 1 Regnskap API calls.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
