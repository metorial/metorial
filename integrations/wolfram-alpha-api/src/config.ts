import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    unitSystem: z
      .enum(['metric', 'imperial'])
      .default('metric')
      .describe('Default unit system for results')
  })
);
