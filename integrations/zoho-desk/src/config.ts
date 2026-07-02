import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'in', 'au', 'cn'])
      .default('us')
      .describe('Zoho data center region'),
    orgId: z.string().describe('Zoho Desk organization ID')
  })
);
