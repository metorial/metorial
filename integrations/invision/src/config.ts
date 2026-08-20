import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    designSystemId: {
      schema: z
        .string()
        .optional()
        .describe('The ID of the InVision DSM design system to interact with'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
