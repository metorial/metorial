import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountCode: z
      .string()
      .describe(
        'Your More Trees account code. Found under Settings > Account Settings on the More Trees platform.'
      )
  })
);
