import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    cdnBaseUrl: z
      .string()
      .default('https://ucarecdn.com')
      .describe('Base URL for the Uploadcare CDN. Defaults to https://ucarecdn.com')
  })
);
