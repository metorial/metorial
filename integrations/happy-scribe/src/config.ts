import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Happy Scribe organization ID. Required for listing transcriptions, glossaries, style guides, and creating orders.'
      )
  })
);
