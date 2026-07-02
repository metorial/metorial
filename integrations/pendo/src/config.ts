import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'us1', 'jpn', 'au'])
      .default('us')
      .describe('Pendo data center region: US, EU, US1, Japan, or Australia')
  })
);
