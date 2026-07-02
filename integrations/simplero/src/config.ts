import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    userAgent: z
      .string()
      .describe('User-Agent header in format "Your App Name (email@example.com)"')
  })
);
