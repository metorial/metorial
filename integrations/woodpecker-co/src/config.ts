import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    companyId: z
      .string()
      .optional()
      .describe(
        'Agency client company ID. Only needed for agency accounts to act on behalf of a specific client account.'
      )
  })
);
