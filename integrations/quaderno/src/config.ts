import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountName: {
      schema: z
        .string()
        .describe(
          'Your Quaderno account name, used in the API base URL (e.g., ACCOUNT_NAME.quadernoapp.com). Can be found via the /authorization endpoint.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
