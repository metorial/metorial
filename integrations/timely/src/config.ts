import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe(
          'Your Timely account/workspace ID. Found in your Timely URL: app.timelyapp.com/:account_id'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
