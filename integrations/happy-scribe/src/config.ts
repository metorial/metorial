import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Happy Scribe organization ID. Required for listing transcriptions, glossaries, style guides, and creating orders.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
