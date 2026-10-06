import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    urlEndpoint: z
      .string()
      .optional()
      .describe(
        'Your ImageKit URL endpoint, e.g. https://ik.imagekit.io/your_imagekit_id. Optional exact CDN endpoint for file downloads through a custom domain. It must match the URL returned by ImageKit.'
      )
  })
);
