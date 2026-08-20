import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountName: {
      schema: z
        .string()
        .describe('Fibery workspace subdomain (e.g., "my-company" for my-company.fibery.io)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
