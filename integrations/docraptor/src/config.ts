import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    testMode: {
      schema: z
        .boolean()
        .default(false)
        .describe(
          'When enabled, all documents are created in test mode (watermarked PDFs, limited Excel). Test documents do not count against monthly limits.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
