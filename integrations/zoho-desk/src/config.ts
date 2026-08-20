import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    orgId: {
      schema: z.string().describe('Zoho Desk organization ID'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
