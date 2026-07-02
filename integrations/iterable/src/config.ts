import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    dataCenter: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'Iterable data center. US-based projects use "us", EU-based projects use "eu".'
      )
  })
);
