import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe('Workday REST API base URL (e.g., https://wd2-impl-services1.workday.com)'),
    tenant: z.string().describe('Workday tenant name (e.g., mycompany)')
  })
);
