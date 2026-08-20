import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organisationId: {
      schema: z
        .string()
        .describe(
          'Your Lessonspace organisation ID. Found in your dashboard URL or settings.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
