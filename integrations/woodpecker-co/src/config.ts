import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    companyId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Agency client company ID. Only needed for agency accounts to act on behalf of a specific client account.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
