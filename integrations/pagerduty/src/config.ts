import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z.enum(['us', 'eu']).default('us').describe('PagerDuty account region (US or EU)')
  })
);
