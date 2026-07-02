import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'au'])
      .default('us')
      .describe('BigML region. "us" uses bigml.io, "au" uses au.bigml.io.'),
    devMode: z
      .boolean()
      .default(false)
      .describe('Enable development mode for free access with limited data size (~1MB).')
  })
);
