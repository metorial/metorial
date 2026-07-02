import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    testmode: z
      .boolean()
      .default(false)
      .describe(
        'When enabled, all print jobs are created in test mode by default. Test jobs are free and never actually sent.'
      )
  })
);
