import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    orgId: z.string().describe('Zoho Desk organization ID')
  })
);
