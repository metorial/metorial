import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    companySlug: z
      .string()
      .describe(
        'Your Booqable company slug (the part before .booqable.com in your account URL, e.g. "mycompany" for mycompany.booqable.com)'
      )
  })
);
