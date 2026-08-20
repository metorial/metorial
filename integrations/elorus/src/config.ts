import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .describe(
          'The Organization ID. Found in Elorus under Settings > Organization > Organization ID.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
