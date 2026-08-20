import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    canvasDomain: {
      schema: z
        .string()
        .describe(
          'Your Canvas instance domain (e.g., myschool.instructure.com). Do not include https:// prefix.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
