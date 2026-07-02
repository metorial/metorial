import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your Storeganise business code (subdomain). For example, if your portal URL is https://spaceup.storeganise.com, enter "spaceup".'
      )
  })
);
