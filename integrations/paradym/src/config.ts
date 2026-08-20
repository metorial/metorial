import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .describe(
          'The Paradym project ID. Found in the Settings tab on the Paradym dashboard.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
