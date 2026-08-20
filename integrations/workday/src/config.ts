import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe('Workday REST API base URL (e.g., https://wd2-impl-services1.workday.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    tenant: {
      schema: z.string().describe('Workday tenant name (e.g., mycompany)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
