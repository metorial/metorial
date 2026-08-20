import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your Storeganise business code (subdomain). For example, if your portal URL is https://spaceup.storeganise.com, enter "spaceup".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
