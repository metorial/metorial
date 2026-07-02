import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteUrl: z
      .string()
      .describe(
        'Full ERPNext site URL (e.g., https://yoursite.erpnext.com or https://your-self-hosted-domain.com)'
      )
  })
);
