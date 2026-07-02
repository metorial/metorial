import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe('Your Appcues Account ID. Found at https://studio.appcues.com/account'),
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe('The region where your Appcues account is hosted (US or EU)')
  })
);
