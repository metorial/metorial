import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z.string().describe('Zoho Invoice Organization ID'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
