import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    applicationId: z
      .string()
      .describe('Your Knack Application ID, found in Builder settings under API & Code')
  })
);
