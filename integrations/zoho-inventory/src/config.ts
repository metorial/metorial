import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .describe(
          'Zoho Inventory Organization ID. Retrieve from the Organizations API after authenticating.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
