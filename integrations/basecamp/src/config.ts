import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe(
          'Your Basecamp account ID. Found in the URL when logged in: https://3.basecampapi.com/{accountId}/'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
