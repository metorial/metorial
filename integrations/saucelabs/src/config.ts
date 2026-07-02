import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    dataCenter: z
      .enum(['us-west-1', 'us-east-4', 'eu-central-1'])
      .default('us-west-1')
      .describe('Sauce Labs data center region for API requests')
  })
);
