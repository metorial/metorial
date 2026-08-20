import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe(
          'Your Mailtrap account ID. Found in the Mailtrap dashboard URL or account settings.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
