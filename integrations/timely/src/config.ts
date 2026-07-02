import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe(
        'Your Timely account/workspace ID. Found in your Timely URL: app.timelyapp.com/:account_id'
      )
  })
);
