import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'Census organization region. US uses app.getcensus.com, EU uses app-eu.getcensus.com.'
      )
  })
);
