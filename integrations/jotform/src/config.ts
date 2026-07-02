import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiDomain: z
      .enum([
        'https://api.jotform.com',
        'https://eu-api.jotform.com',
        'https://hipaa-api.jotform.com'
      ])
      .default('https://api.jotform.com')
      .describe(
        'The API domain to use. Standard: api.jotform.com, EU: eu-api.jotform.com, HIPAA: hipaa-api.jotform.com'
      )
  })
);
