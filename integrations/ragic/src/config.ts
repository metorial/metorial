import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    serverDomain: z
      .string()
      .default('www.ragic.com')
      .describe(
        'Ragic server domain (e.g., www.ragic.com, na3.ragic.com, ap5.ragic.com, eu2.ragic.com). Must match the server where your account resides.'
      ),
    accountName: z
      .string()
      .describe(
        'Your Ragic account/database name as it appears in the URL path (e.g., "demo" in https://www.ragic.com/demo/sales/1)'
      )
  })
);
