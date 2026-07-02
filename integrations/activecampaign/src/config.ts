import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiUrl: z
      .string()
      .describe('Your ActiveCampaign API URL (e.g. https://youraccountname.api-us1.com)')
  })
);
