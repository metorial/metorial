import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    applicationId: {
      schema: z
        .string()
        .describe('Your Knack Application ID, found in Builder settings under API & Code'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
