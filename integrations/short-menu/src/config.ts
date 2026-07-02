import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .default('shm.to')
      .describe('Default domain for short links (e.g. shm.to or your custom domain)')
  })
);
