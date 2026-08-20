import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    imageTemplateHash: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default image template hash used for the image impressions polling trigger. Obtain from your Hyperise dashboard or via the List Image Templates tool.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
