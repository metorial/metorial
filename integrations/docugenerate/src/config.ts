import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu', 'au'])
        .default('us')
        .describe(
          'Processing region for templates and documents. Use "eu" for GDPR compliance or "au" for Australia-based processing.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
