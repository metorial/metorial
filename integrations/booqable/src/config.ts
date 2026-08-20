import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    companySlug: {
      schema: z
        .string()
        .describe(
          'Your Booqable company slug (the part before .booqable.com in your account URL, e.g. "mycompany" for mycompany.booqable.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
