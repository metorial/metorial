import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe('Your Appcues Account ID. Found at https://studio.appcues.com/account'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('The region where your Appcues account is hosted (US or EU)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
