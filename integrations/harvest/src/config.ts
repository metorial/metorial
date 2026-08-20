import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe('Your Harvest Account ID. Found at https://id.getharvest.com/developers'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
