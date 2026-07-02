import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    sandbox: z
      .boolean()
      .default(false)
      .describe(
        'Enable sandbox/dev mode for testing. Returns randomized results without consuming quota.'
      )
  })
);
