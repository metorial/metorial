import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    testMode: z
      .boolean()
      .default(false)
      .describe(
        'When enabled, all documents are created in test mode (watermarked PDFs, limited Excel). Test documents do not count against monthly limits.'
      )
  })
);
