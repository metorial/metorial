import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    siteUrl: {
      schema: z
        .string()
        .describe(
          'The URL of your EspoCRM instance (e.g., https://crm.yourcompany.com). This is the same URL you use to access EspoCRM in your browser.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
