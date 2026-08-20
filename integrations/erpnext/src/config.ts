import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    siteUrl: {
      schema: z
        .string()
        .describe(
          'Full ERPNext site URL (e.g., https://yoursite.erpnext.com or https://your-self-hosted-domain.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
