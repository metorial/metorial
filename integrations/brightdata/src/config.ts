import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    datasetId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default dataset/scraper ID used by the scraping job completion trigger to monitor jobs.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
