import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
      accountName: z
        .string()
        .describe(
          'Your Ragic account/database name as it appears in the URL path (e.g., "demo" in https://www.ragic.com/demo/sales/1)'
        )
    })
    .passthrough()
);
