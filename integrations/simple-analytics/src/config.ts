import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    hostname: z
      .string()
      .describe('The website hostname to retrieve analytics for (e.g. "example.com")')
  })
);
