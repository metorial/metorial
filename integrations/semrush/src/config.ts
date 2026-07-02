import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    database: z
      .string()
      .default('us')
      .describe(
        'Regional database code (e.g., us, uk, de, fr, es, it, br, ca, au, ru). Defaults to "us".'
      )
  })
);
