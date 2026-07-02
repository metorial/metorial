import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['sfo', 'lon', 'ams'])
      .default('sfo')
      .describe('Browser region: sfo (San Francisco), lon (London), ams (Amsterdam)')
  })
);
