import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationSlug: {
      schema: z.string().describe('The slug of the Sentry organization to interact with'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .enum(['us', 'de'])
        .default('us')
        .describe('The Sentry data region (US or EU/DE)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
