import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe(
        'The unique account name (folder of forms) found in your Formdesk account settings. This is the domain portion of your Formdesk URL.'
      )
  })
);
