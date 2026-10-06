import { SlateConfig } from 'slates';
import { z } from 'zod';
export const config = SlateConfig.create(
  z.object({
    onBehalfOf: z
      .string()
      .optional()
      .describe(
        'Retired v1/v2 setting. Remove it and reconnect; choose the optional acting user during Harvest v3 custom authentication.'
      )
  })
);
