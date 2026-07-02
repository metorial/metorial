import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organisationId: z
      .string()
      .describe('Your Lessonspace organisation ID. Found in your dashboard URL or settings.')
  })
);
