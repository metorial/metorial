import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    dataCenter: z
      .enum(['us', 'eu', 'jp', 'sg', 'au'])
      .default('us')
      .describe('Workato data center region for your workspace')
  })
);
