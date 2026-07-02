import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountName: z
      .string()
      .describe(
        'Your Quaderno account name, used in the API base URL (e.g., ACCOUNT_NAME.quadernoapp.com). Can be found via the /authorization endpoint.'
      )
  })
);
