import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe(
        'Your Basecamp account ID. Found in the URL when logged in: https://3.basecampapi.com/{accountId}/'
      )
  })
);
