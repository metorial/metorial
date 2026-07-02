import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe(
        'Your Coupa instance URL, e.g. https://mycompany.coupahost.com or https://mycompany.coupacloud.com'
      )
  })
);
