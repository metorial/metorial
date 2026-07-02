import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    companyId: z
      .string()
      .optional()
      .describe('Your Whop company ID (e.g. biz_xxxxx). Required for most API operations.')
  })
);
