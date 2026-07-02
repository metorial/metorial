import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    urlEndpoint: z
      .string()
      .optional()
      .describe(
        'Your ImageKit URL endpoint, e.g. https://ik.imagekit.io/your_imagekit_id. Used for constructing asset URLs and cache purge operations.'
      )
  })
);
