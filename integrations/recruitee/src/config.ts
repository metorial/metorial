import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    companyId: {
      schema: z
        .string()
        .describe(
          'Your Recruitee Company ID (numeric). Found in your Recruitee account URL or settings.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
