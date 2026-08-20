import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiDomain: {
      schema: z
        .enum([
          'https://api.jotform.com',
          'https://eu-api.jotform.com',
          'https://hipaa-api.jotform.com'
        ])
        .default('https://api.jotform.com')
        .describe(
          'The API domain to use. Standard: api.jotform.com, EU: eu-api.jotform.com, HIPAA: hipaa-api.jotform.com'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
