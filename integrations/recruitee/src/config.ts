import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    companyId: z
      .string()
      .describe(
        'Your Recruitee Company ID (numeric). Found in your Recruitee account URL or settings.'
      )
  })
);
