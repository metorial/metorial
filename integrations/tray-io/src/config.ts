import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'apac'])
      .default('us')
      .describe('Tray.io region. Determines the API endpoint used for all requests.')
  })
);
