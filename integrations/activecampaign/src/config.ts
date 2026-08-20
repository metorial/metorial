import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiUrl: {
      schema: z
        .string()
        .describe('Your ActiveCampaign API URL (e.g. https://youraccountname.api-us1.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
