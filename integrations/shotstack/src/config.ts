import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['production', 'sandbox'])
        .default('sandbox')
        .describe(
          'API environment. Use "sandbox" for testing (watermarked output) or "production" for live usage.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
