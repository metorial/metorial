import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    datasetId: z
      .string()
      .optional()
      .describe(
        'Default dataset/scraper ID used by the scraping job completion trigger to monitor jobs.'
      )
  })
);
