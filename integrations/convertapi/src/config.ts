import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['auto', 'eu', 'uk', 'us', 'ca', 'as', 'au'])
        .default('auto')
        .describe(
          'API region for processing. Use "auto" for automatic GEO DNS routing, or select a specific region (e.g., "eu" for GDPR compliance).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
