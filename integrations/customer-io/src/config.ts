import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'The data center region for your Customer.io account. US is the default for most accounts.'
      )
  })
);
