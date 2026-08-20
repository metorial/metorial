import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    urlEndpoint: {
      schema: z
        .string()
        .optional()
        .describe(
          'Your ImageKit URL endpoint, e.g. https://ik.imagekit.io/your_imagekit_id. Used for constructing asset URLs and cache purge operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
