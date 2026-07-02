import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe('New Relic data center region. US or EU.'),
    accountId: z.string().describe('New Relic Account ID. Required for most operations.')
  })
);
