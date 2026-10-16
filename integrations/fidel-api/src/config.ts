import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['test', 'live'])
      .default('test')
      .describe(
        'Environment label for this connection. The API key selects test or live data; changing this label does not change the API key.'
      )
  })
);
