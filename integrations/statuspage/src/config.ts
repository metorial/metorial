import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    pageId: z
      .string()
      .describe(
        'The Page ID found on the Statuspage API info page. Most API operations are scoped to this page.'
      )
  })
);
