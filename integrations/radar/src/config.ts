import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['test', 'live'])
      .default('live')
      .describe(
        'Radar environment to use. Test keys work with the test environment, live keys with the live environment.'
      )
  })
);
