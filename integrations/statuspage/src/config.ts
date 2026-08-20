import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    pageId: {
      schema: z
        .string()
        .describe(
          'The Page ID found on the Statuspage API info page. Most API operations are scoped to this page.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
