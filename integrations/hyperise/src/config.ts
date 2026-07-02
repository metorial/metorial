import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    imageTemplateHash: z
      .string()
      .optional()
      .describe(
        'Default image template hash used for the image impressions polling trigger. Obtain from your Hyperise dashboard or via the List Image Templates tool.'
      )
  })
);
